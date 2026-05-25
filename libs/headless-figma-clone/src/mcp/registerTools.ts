import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolve } from 'node:path';
import type { DocumentEngine } from '../engine/DocumentEngine.js';
import { compileSubtreeForScreenshot } from '../render/compileForScreenshot.js';
import { getLocalFontsFileBaseUrl } from '../fonts/localFontRegistry.js';
import { designCompiler } from '../render/DesignCompiler.js';
import { buildImageDataUrlForSubtree, buildImageFileUrlForSubtree } from '../render/imageDataUrls.js';
import { playwrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';
import { collectMetadataTree, collectPagesIndex } from './metadata.js';
import { runMcpToolWithCancellation } from './runMcpToolWithCancellation.js';
import { toolErrorJson, toolJson } from './useFigmaMap.js';
import { runUseFigmaScript } from './useFigmaScript.js';
import { captureScriptScreenshots } from './scriptMcpParity.js';
import { buildVariableDefsPayload } from '../variables/resolution.js';
import { searchDesignSystem } from '../designSystem/searchDesignSystem.js';

export interface RegisterToolsDeps {
  engine: DocumentEngine;
  screenshotTimeoutMs: number;
  screenshotDefaultBackground: 'white' | 'transparent';
  screenshotDefaultDeviceScaleFactor: number;
}

export function registerHeadlessFigmaTools(server: McpServer, deps: RegisterToolsDeps): void {
  const { engine } = deps;

  server.registerTool(
    'create_new_file',
    {
      description:
        "Creates a new blank Figma Design file in your drafts folder. If you belong to multiple plans, you'll be asked which team or organization to create the file in.",
      inputSchema: {
        name: z.string().min(1).max(256).optional(),
        directory: z.string().optional(),
      },
    },
    async (args) => {
      return runMcpToolWithCancellation(async () => {
        const name = args.name ?? 'Untitled';
        const r = await engine.createEmptyFile({
          fileName: name,
          directory: args.directory ? resolve(process.cwd(), args.directory) : undefined,
        });
        return { content: [{ type: 'text' as const, text: toolJson(r) }] };
      });
    }
  );

  server.registerTool(
    'open_file',
    {
      description:
        'Loads an existing headless-figma-clone document (*.hfc.json) from disk and sets it as the active file for subsequent MCP tools.',
      inputSchema: {
        path: z.string().min(1),
      },
    },
    async (args) => {
      return runMcpToolWithCancellation(async () => {
        const abs = resolve(process.cwd(), args.path);
        if (!abs.toLowerCase().endsWith('.hfc.json')) {
          return {
            content: [
              {
                type: 'text' as const,
                text: toolErrorJson('VALIDATION_ERROR', 'open_file path must end with .hfc.json'),
              },
            ],
            isError: true,
          };
        }
        try {
          await engine.loadFromDisk({ absolutePath: abs });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('VALIDATION_ERROR', msg) }],
            isError: true,
          };
        }
        const f = engine.getActiveFile();
        const fp = engine.getActiveFilePath();
        if (!f || !fp) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file after load') }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: toolJson({ fileKey: f.fileKey, filePath: fp }),
            },
          ],
        };
      });
    }
  );

  server.registerTool(
    'upload_assets',
    {
      description:
        'Uploads a supported raster image (PNG, JPEG, GIF, WebP) into the active file asset registry for use in ImagePaint fills. Provide exactly one of dataUrl (data:image/...;base64,...) or filePath (relative to cwd).',
      inputSchema: z
        .object({
          dataUrl: z.string().min(32).optional(),
          filePath: z.string().min(1).optional(),
        })
        .refine((a) => Boolean(a.dataUrl) !== Boolean(a.filePath), {
          message: 'Provide exactly one of dataUrl or filePath',
        }),
    },
    async (args) => {
      return runMcpToolWithCancellation(async () => {
        if (args.filePath) {
          const abs = resolve(process.cwd(), args.filePath);
          const r = await engine.uploadAssetFromFile({ absolutePath: abs });
          if (!r.ok) {
            return {
              content: [{ type: 'text' as const, text: toolErrorJson(r.errorCode, r.message) }],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: toolJson({ assetId: r.assetId, sha256: r.sha256, mimeType: r.mimeType }),
              },
            ],
          };
        }
        const r = await engine.uploadAssetFromDataUrl({ dataUrl: args.dataUrl! });
        if (!r.ok) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson(r.errorCode, r.message) }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: toolJson({ assetId: r.assetId, sha256: r.sha256, mimeType: r.mimeType }),
            },
          ],
        };
      });
    }
  );

  server.registerTool(
    'get_variable_defs',
    {
      description:
        'Returns variable collections, active modes, and resolved values for the active file (headless-figma-clone Phase 5 subset).',
      inputSchema: {
        fileKey: z.string().optional(),
      },
    },
    async () => {
      return runMcpToolWithCancellation(async () => {
        const file = engine.getActiveFile();
        if (!file) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
            isError: true,
          };
        }
        const payload = buildVariableDefsPayload(file);
        return { content: [{ type: 'text' as const, text: toolJson(payload) }] };
      });
    }
  );

  server.registerTool(
    'search_design_system',
    {
      description:
        'Search file-local variables, text/paint/effect/grid styles, and components in the active file. ' +
        'Optional query (default ""): case-insensitive substring match on names; omit or use "" to list items without name filtering (first `limit` hits, sorted by kind then id). ' +
        'Optional limit (default 20, max 500).',
      inputSchema: {
        query: z.string().default(''),
        limit: z.number().int().positive().max(500).optional().default(20),
      },
    },
    async (args) => {
      return runMcpToolWithCancellation(async () => {
        const file = engine.getActiveFile();
        if (!file) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
            isError: true,
          };
        }
        const hits = searchDesignSystem(file, args.query ?? '', args.limit ?? 20);
        return { content: [{ type: 'text' as const, text: toolJson({ hits }) }] };
      });
    }
  );

  server.registerTool(
    'get_metadata',
    {
      description:
        'Returns a sparse XML representation of your selection containing just basic properties such as the layer IDs, names, types, position and sizes. This is an outline that your Agent can then break down and call get_design_context on to retrieve only the styling information of the design it needs. Useful for very large designs where get_design_context produces output with a large context size. It also works with multiple selections or the whole page if you don\'t select anything.',
      inputSchema: {
        fileKey: z.string().optional(),
        nodeId: z.string().optional(),
        maxDepth: z.number().int().positive().optional(),
      },
    },
    async (args) => {
      return runMcpToolWithCancellation(async (signal) => {
        const file = engine.getActiveFile();
        if (!file) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
            isError: true,
          };
        }
        const nodeId = args.nodeId?.trim();
        if (!nodeId) {
          const pages = collectPagesIndex(file.document);
          if (pages.length === 0) {
            return {
              content: [{ type: 'text' as const, text: toolErrorJson('VALIDATION_ERROR', 'No pages in document') }],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: toolJson({ metadataFormatVersion: 1 as const, pages }),
              },
            ],
          };
        }
        const node = engine.queryNode(nodeId);
        if (!node) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('UNKNOWN_NODE', `Unknown node ${nodeId}`) }],
            isError: true,
          };
        }
        try {
          const root = collectMetadataTree(node, {
            maxDepth: args.maxDepth,
            signal,
            graph: engine.getGraphIndexes(),
          });
          const payload = {
            metadataFormatVersion: 1 as const,
            childStacking: 'later-children-on-top' as const,
            root,
          };
          return { content: [{ type: 'text' as const, text: toolJson(payload) }] };
        } catch (e) {
          if (signal.aborted) {
            const msg = e instanceof Error ? e.message : 'Tool run aborted';
            return {
              content: [{ type: 'text' as const, text: toolErrorJson('VALIDATION_ERROR', msg) }],
              isError: true,
            };
          }
          throw e;
        }
      });
    }
  );

  server.registerTool(
    'get_design_context',
    {
      description:
        'Use the MCP server to get the design context for a layer or your selection in Figma. The output is HTML + CSS.',
      inputSchema: {
        nodeId: z.string().regex(/^I[0-9]+$/),
        includeCss: z.boolean().optional().default(true),
        inlineCss: z.boolean().optional().default(true),
        viewportPaddingPx: z.number().optional().default(0),
      },
    },
    async (args) => {
      return runMcpToolWithCancellation(async () => {
        const file = engine.getActiveFile();
        if (!file) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
            isError: true,
          };
        }
        const fp = engine.getActiveFilePath();
        const compiled = designCompiler.compileSubtree({
          envelope: file,
          rootNodeId: args.nodeId,
          options: {
            viewportPaddingPx: args.viewportPaddingPx,
            includeCss: args.includeCss,
            inlineCss: args.inlineCss,
            imageDataUrlByHash:
              fp !== null ? buildImageDataUrlForSubtree(file, fp, args.nodeId) : {},
          },
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: toolJson({
                html: compiled.html,
                css: compiled.css,
                warnings: compiled.warnings,
              }),
            },
          ],
        };
      });
    }
  );

  server.registerTool(
    'get_screenshot',
    {
      description:
        'Allows the agent to take a screenshot of your selection. This helps preserve layout fidelity in the generated code. Recommended to keep on (only turn off if you\'re concerned about token limits).',
      inputSchema: {
        nodeId: z.string().regex(/^I[0-9]+$/),
        format: z.enum(['png', 'jpeg']).default('png'),
        scale: z.number().positive().default(1),
        deviceScaleFactor: z.number().positive().optional(),
        background: z.enum(['white', 'transparent']).optional(),
      },
    },
    async (args) => {
      return runMcpToolWithCancellation(async () => {
        const file = engine.getActiveFile();
        if (!file) {
          return {
            content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
            isError: true,
          };
        }
        const fp = engine.getActiveFilePath();
        const compiled = await compileSubtreeForScreenshot({
          envelope: file,
          rootNodeId: args.nodeId,
          options: {
            viewportPaddingPx: 0,
            includeCss: true,
            inlineCss: true,
            fontBaseUrl: getLocalFontsFileBaseUrl(),
            imageDataUrlByHash:
              fp !== null ? buildImageFileUrlForSubtree(file, fp, args.nodeId) : {},
          },
          screenshot: playwrightScreenshotService,
          screenshotTimeoutMs: deps.screenshotTimeoutMs,
        });
        const dpr = args.deviceScaleFactor ?? args.scale * deps.screenshotDefaultDeviceScaleFactor;
        const bg = args.background ?? deps.screenshotDefaultBackground;
        const shot = await playwrightScreenshotService.capture({
          compiled,
          clipRect: compiled.rootClip,
          format: args.format,
          scale: args.scale,
          deviceScaleFactor: dpr,
          background: bg,
          timeoutMs: deps.screenshotTimeoutMs,
        });
        return {
          content: [
            {
              type: 'image' as const,
              data: shot.bytes.toString('base64'),
              mimeType: shot.mimeType,
              _meta: { width: shot.width, height: shot.height },
            },
          ],
        };
      });
    }
  );

  const useFigmaInput = z.object({
    /** JavaScript executed like Figma remote MCP: async-wrapped body with top-level await and `return` for output. */
    code: z.string().min(1),
    /** Logging only (matches Figma); does not change execution. */
    skillNames: z.string().max(512).optional(),
  });

  server.registerTool(
    'use_figma',
    {
      description:
        'The general-purpose tool for writing to Figma files. Use it to create, edit, delete, or inspect objects in Figma Design files. In Figma Design files, use_figma can be used to work with pages, frames, components, variants, variables, styles, text, images, and more. When relevant, the agent will first check your design system or existing file content before creating anything from scratch.',
      inputSchema: useFigmaInput,
    },
    async (args) => {
      let commandSuccess = false;
      let commandErrorCode: string | undefined;
      let commandMessage: string | undefined;
      try {
        return await runMcpToolWithCancellation(async (signal) => {
          void args.skillNames;
          const run = await runUseFigmaScript(args.code.trim(), engine, { signal });
          if (run.kind === 'error') {
            commandErrorCode = run.errorCode;
            commandMessage = run.message;
            return {
              content: [{ type: 'text' as const, text: toolErrorJson(run.errorCode, run.message) }],
              isError: true,
            };
          }
          if (run.currentPageId) {
            engine.setCurrentPageId(run.currentPageId);
          }
          let touchedNodeIds: string[] = [];
          let txWarnings: string[] = [];
          if (run.operations.length > 0) {
            const r =
              run.preApplied && run.committedWorking
                ? await engine.commitEnvelope(run.committedWorking, {
                    signal,
                    touchedNodeIds: run.touchedNodeIds,
                  })
                : await engine.applyTransaction(run.operations, { signal });
            if (!r.success) {
              if (run.preApplied) {
                await engine.reloadActiveFileFromDisk();
              }
              commandErrorCode = r.errorCode;
              commandMessage = r.message;
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: toolErrorJson(r.errorCode, r.message, r.details),
                  },
                ],
                isError: true,
              };
            }
            touchedNodeIds = r.touchedNodeIds;
            txWarnings = r.warnings ?? [];
          }
          const detachedWarnings: string[] = [];
          if (run.detachedNodes.length > 0) {
            await engine.appendDetachedIssues(run.detachedNodes);
            detachedWarnings.push(
              `${String(run.detachedNodes.length)} detached node(s) recorded in issues.hfc.json`
            );
          }
          commandSuccess = true;
          const data: Record<string, unknown> = {
            touchedNodeIds,
            warnings: [...txWarnings, ...detachedWarnings, ...(run.snapshotWarnings ?? [])],
            result: run.result,
          };
          const content: Array<
            | { type: 'text'; text: string }
            | { type: 'image'; data: string; mimeType: string; _meta?: Record<string, unknown> }
          > = [{ type: 'text', text: toolJson(data) }];

          if (run.screenshotQueue.length > 0) {
            const file = engine.getActiveFile();
            const fp = engine.getActiveFilePath();
            if (file) {
              const shots = await captureScriptScreenshots({
                envelope: file,
                filePath: fp,
                requests: run.screenshotQueue,
                placeholderNodeIds: new Set(run.placeholderNodeIds),
                screenshot: playwrightScreenshotService,
                timeoutMs: deps.screenshotTimeoutMs,
                defaultDeviceScaleFactor: deps.screenshotDefaultDeviceScaleFactor,
                defaultBackground: deps.screenshotDefaultBackground,
              });
              for (const shot of shots) {
                content.push({
                  type: 'image',
                  data: shot.bytes.toString('base64'),
                  mimeType: shot.mimeType,
                  _meta: { caption: shot.caption, nodeId: shot.nodeId },
                });
              }
            }
          }

          for (const write of run.ioWrites) {
            if (write.mimeType.startsWith('image/')) {
              const bytes =
                typeof write.data === 'string'
                  ? Buffer.from(write.data, 'utf8')
                  : Buffer.from(write.data);
              content.push({
                type: 'image',
                data: bytes.toString('base64'),
                mimeType: write.mimeType,
                _meta: { path: write.path },
              });
            } else {
              const text =
                typeof write.data === 'string' ? write.data : new TextDecoder().decode(write.data);
              content.push({
                type: 'text',
                text: `--- ${write.path} ---\n${text}`,
              });
            }
          }

          return { content };
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        commandErrorCode = 'VALIDATION_ERROR';
        commandMessage = msg;
        return {
          content: [{ type: 'text' as const, text: toolErrorJson('VALIDATION_ERROR', msg) }],
          isError: true,
        };
      } finally {
        await engine.appendCommandIssue({
          success: commandSuccess,
          errorCode: commandErrorCode,
          message: commandMessage,
        });
      }
    }
  );
}

export function createHeadlessMcpServer(deps: RegisterToolsDeps): McpServer {
  const server = new McpServer(
    { name: 'headless-figma-clone', version: '1.0.0' },
    { capabilities: { logging: {} } }
  );
  registerHeadlessFigmaTools(server, deps);
  return server;
}
