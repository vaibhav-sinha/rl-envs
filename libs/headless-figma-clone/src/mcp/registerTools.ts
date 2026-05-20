import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolve } from 'node:path';
import type { DocumentEngine } from '../engine/DocumentEngine.js';
import { compileSubtreeForScreenshot } from '../render/compileForScreenshot.js';
import { getLocalFontsFileBaseUrl } from '../fonts/localFontRegistry.js';
import { designCompiler } from '../render/DesignCompiler.js';
import { buildImageDataUrlByHash } from '../render/imageDataUrls.js';
import { playwrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';
import { collectMetadataTree, collectPagesIndex } from './metadata.js';
import { toolErrorJson, toolJson } from './useFigmaMap.js';
import { runUseFigmaScript } from './useFigmaScript.js';
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

  function imageDataUrlMapForActiveFile(): Record<string, string> {
    const file = engine.getActiveFile();
    const fp = engine.getActiveFilePath();
    if (!file || !fp) return {};
    return buildImageDataUrlByHash(file, fp);
  }

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
      const name = args.name ?? 'Untitled';
      const r = await engine.createEmptyFile({
        fileName: name,
        directory: args.directory ? resolve(process.cwd(), args.directory) : undefined,
      });
      return { content: [{ type: 'text' as const, text: toolJson(r) }] };
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
      const file = engine.getActiveFile();
      if (!file) {
        return {
          content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
          isError: true,
        };
      }
      const payload = buildVariableDefsPayload(file);
      return { content: [{ type: 'text' as const, text: toolJson(payload) }] };
    }
  );

  server.registerTool(
    'search_design_system',
    {
      description:
        'Search variables, text styles, paint styles, and components in the active file. Returns deterministic ranked hits (tie-break: kind, id, name).',
      inputSchema: {
        query: z.string().default(''),
        limit: z.number().int().positive().max(500).optional().default(20),
      },
    },
    async (args) => {
      const file = engine.getActiveFile();
      if (!file) {
        return {
          content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
          isError: true,
        };
      }
      const hits = searchDesignSystem(file, args.query ?? '', args.limit ?? 20);
      return { content: [{ type: 'text' as const, text: toolJson({ hits }) }] };
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
      const root = collectMetadataTree(node, { maxDepth: args.maxDepth });
      const payload = {
        metadataFormatVersion: 1 as const,
        childStacking: 'later-children-on-top' as const,
        root,
      };
      return { content: [{ type: 'text' as const, text: toolJson(payload) }] };
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
      const file = engine.getActiveFile();
      if (!file) {
        return {
          content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
          isError: true,
        };
      }
      const compiled = designCompiler.compileSubtree({
        envelope: file,
        rootNodeId: args.nodeId,
        options: {
          viewportPaddingPx: args.viewportPaddingPx,
          includeCss: args.includeCss,
          inlineCss: args.inlineCss,
          imageDataUrlByHash: imageDataUrlMapForActiveFile(),
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
      const file = engine.getActiveFile();
      if (!file) {
        return {
          content: [{ type: 'text' as const, text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
          isError: true,
        };
      }
      const compiled = await compileSubtreeForScreenshot({
        envelope: file,
        rootNodeId: args.nodeId,
        options: {
          viewportPaddingPx: 0,
          includeCss: true,
          inlineCss: true,
          fontBaseUrl: getLocalFontsFileBaseUrl(),
          imageDataUrlByHash: imageDataUrlMapForActiveFile(),
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
      try {
        void args.skillNames;
        const run = await runUseFigmaScript(args.code.trim(), engine);
        if (run.kind === 'error') {
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
          const r = await engine.applyTransaction(run.operations);
          if (!r.success) {
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
        const data: Record<string, unknown> = {
          touchedNodeIds,
          warnings: [...txWarnings, ...(run.snapshotWarnings ?? [])],
          result: run.result,
        };
        return {
          content: [
            {
              type: 'text' as const,
              text: toolJson(data),
            },
          ],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          content: [{ type: 'text' as const, text: toolErrorJson('VALIDATION_ERROR', msg) }],
          isError: true,
        };
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
