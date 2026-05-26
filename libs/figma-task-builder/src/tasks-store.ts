import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { CHECK_CATALOG } from './check-catalog.js';
import type { TaskBuilderConfig } from './config.js';
import { buildDefaultInstruction } from './instruction-preamble.js';
import { normalizeEvalSpec, prepareEvalSpecForSave } from './category-importance.js';
import { validateDesignSpec, type DesignSpec } from './design-spec-validator.js';
import { defaultEvalSpec, validateEvalSpec } from './eval-spec-validator.js';
import { debugLogForExport, exportDebugEnabled } from './export-instance-debug.js';
import { assertDesignBaseExists, cloneHarborToDraft, finalizeTask } from './finalize.js';
import { HfcClient, type ImportHfcResponse } from './hfc-client.js';
import { writeJsonFile } from './write-json-stream.js';
import type {
  BuilderState,
  DesignListItem,
  EvalSpec,
  FullTaskPayload,
  TaskAssetInfo,
  TaskListItem,
  TaskStatus,
  WizardStep,
} from './types.js';

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const BUILDER_STATE = 'builder-state.json';
const EVAL_SPEC_FILE = 'eval-spec.json';
const DESIGN_SPEC_FILE = 'design-spec.json';

function nowIso(): string {
  return new Date().toISOString();
}

function draftPath(config: TaskBuilderConfig, id: string): string {
  return join(config.tasksDir, id);
}

function designSpecPathForTask(config: TaskBuilderConfig, taskId: string): string | null {
  const draft = join(draftPath(config, taskId), 'environment', DESIGN_SPEC_FILE);
  if (existsSync(draft)) return draft;
  const harbor = join(config.harborTasksDir, taskId, 'environment', DESIGN_SPEC_FILE);
  if (existsSync(harbor)) return harbor;
  return null;
}

function hasDesignSpec(config: TaskBuilderConfig, taskId: string): boolean {
  return designSpecPathForTask(config, taskId) !== null;
}

function readDesignSpecFile(path: string): DesignSpec {
  return JSON.parse(readFileSync(path, 'utf8')) as DesignSpec;
}

function normalizeDesignName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!SLUG_RE.test(slug)) {
    throw new Error('INVALID_DESIGN_NAME: use lowercase letters, numbers, and hyphens');
  }
  return slug;
}

function logPersistDebug(exportId: string, imported: ImportHfcResponse, filePath: string): void {
  if (!exportDebugEnabled()) return;
  const dbg = debugLogForExport(exportId);
  dbg.walkImportEnvelope('persist_disk_envelope', imported.envelope);
  dbg.log('persist', `wrote ${filePath}`);
}

function assetExt(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'gif';
}

function writeDesignAssets(
  sidecarDir: string,
  assets: Array<{ hash: string; mimeType: string; base64: string }>
): void {
  rmSync(sidecarDir, { recursive: true, force: true });
  mkdirSync(sidecarDir, { recursive: true });
  for (const asset of assets) {
    writeFileSync(
      join(sidecarDir, `${asset.hash}.${assetExt(asset.mimeType)}`),
      Buffer.from(asset.base64, 'base64')
    );
  }
}

export class TasksStore {
  private readonly hfc: HfcClient;

  constructor(private readonly config: TaskBuilderConfig) {
    this.hfc = new HfcClient(config.hfcUrl);
    mkdirSync(config.tasksDir, { recursive: true });
    mkdirSync(config.harborTasksDir, { recursive: true });
    mkdirSync(config.designsDir, { recursive: true });
  }

  validateSlug(id: string): void {
    if (!SLUG_RE.test(id)) {
      throw new Error('INVALID_ID: task id must be lowercase alphanumeric with hyphens');
    }
  }

  assertIdAvailable(id: string): void {
    if (existsSync(draftPath(this.config, id)) || existsSync(join(this.config.harborTasksDir, id))) {
      throw new Error(`DUPLICATE_ID: task "${id}" already exists`);
    }
  }

  listDesigns(): DesignListItem[] {
    if (!existsSync(this.config.designsDir)) return [];
    const items: DesignListItem[] = [];
    for (const name of readdirSync(this.config.designsDir)) {
      const dir = join(this.config.designsDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const designPath = join(dir, 'design.hfc.json');
      if (!existsSync(designPath)) continue;
      items.push({
        name,
        has_sidecar: existsSync(join(dir, 'design.hfc.assets')),
        updated_at: statSync(designPath).mtime.toISOString(),
      });
    }
    items.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return items;
  }

  getDesign(name: string): DesignListItem {
    this.validateSlug(name);
    const designPath = join(this.config.designsDir, name, 'design.hfc.json');
    if (!existsSync(designPath)) {
      throw new Error(`NOT_FOUND: design export "${name}"`);
    }
    return {
      name,
      has_sidecar: existsSync(join(this.config.designsDir, name, 'design.hfc.assets')),
      updated_at: statSync(designPath).mtime.toISOString(),
    };
  }

  listTasks(): TaskListItem[] {
    const items: TaskListItem[] = [];

    if (existsSync(this.config.tasksDir)) {
      for (const name of readdirSync(this.config.tasksDir)) {
        const root = join(this.config.tasksDir, name);
        if (!statSync(root).isDirectory()) continue;
        const statePath = join(root, BUILDER_STATE);
        if (!existsSync(statePath)) continue;
        const state = JSON.parse(readFileSync(statePath, 'utf8')) as BuilderState;
        const status: TaskStatus = existsSync(join(root, '.complete')) ? 'complete' : 'draft';
        items.push({
          id: state.id,
          name: state.name,
          status,
          created_at: state.created_at,
          updated_at: state.updated_at,
          has_design_spec: hasDesignSpec(this.config, state.id),
        });
      }
    }

    if (existsSync(this.config.harborTasksDir)) {
      for (const name of readdirSync(this.config.harborTasksDir)) {
        const root = join(this.config.harborTasksDir, name);
        if (!statSync(root).isDirectory()) continue;
        if (items.some((t) => t.id === name)) continue;
        const st = statSync(root);
        items.push({
          id: name,
          name,
          status: 'complete',
          created_at: st.birthtime.toISOString(),
          updated_at: st.mtime.toISOString(),
          has_design_spec: hasDesignSpec(this.config, name),
        });
      }
    }

    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return items;
  }

  createTask(name: string, copyFrom?: string): BuilderState {
    const id = name.trim();
    this.validateSlug(id);

    if (copyFrom) {
      this.validateSlug(copyFrom);
      if (copyFrom === id) {
        return this.loadHarborAsDraft(copyFrom);
      }
      if (existsSync(draftPath(this.config, id))) {
        throw new Error(`DUPLICATE_ID: draft "${id}" already exists`);
      }
      cloneHarborToDraft(this.config, copyFrom, id);
      return this.readBuilderState(id);
    }

    this.assertIdAvailable(id);
    const root = draftPath(this.config, id);
    mkdirSync(join(root, 'environment', 'assets'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });

    const ts = nowIso();
    const state: BuilderState = {
      id,
      name: id,
      created_at: ts,
      updated_at: ts,
      current_step: 'instruction',
      metadata: {
        description: `Figma design task: ${id}`,
        difficulty: 'easy',
        category: 'design',
        verifier_timeout_sec: 900,
        agent_timeout_sec: 600,
      },
      design: { completed: false },
    };

    writeFileSync(join(root, BUILDER_STATE), JSON.stringify(state, null, 2) + '\n', 'utf8');
    writeFileSync(join(root, 'instruction.md'), buildDefaultInstruction(id), 'utf8');
    writeFileSync(
      join(root, 'tests', EVAL_SPEC_FILE),
      JSON.stringify(defaultEvalSpec(), null, 2) + '\n',
      'utf8'
    );
    writeFileSync(join(root, 'environment', 'assets', '.gitkeep'), '', 'utf8');

    return state;
  }

  readBuilderState(id: string): BuilderState {
    const path = join(draftPath(this.config, id), BUILDER_STATE);
    if (!existsSync(path)) throw new Error(`NOT_FOUND: draft ${id}`);
    return JSON.parse(readFileSync(path, 'utf8')) as BuilderState;
  }

  private writeBuilderState(id: string, state: BuilderState): void {
    state.updated_at = nowIso();
    writeFileSync(join(draftPath(this.config, id), BUILDER_STATE), JSON.stringify(state, null, 2) + '\n', 'utf8');
  }

  getTask(id: string): FullTaskPayload {
    const draftRoot = draftPath(this.config, id);
    if (!existsSync(draftRoot)) {
      throw new Error(`NOT_FOUND: task ${id}`);
    }

    const builderState = this.readBuilderState(id);
    const instructionPath = join(draftRoot, 'instruction.md');
    const evalPath = join(draftRoot, 'tests', EVAL_SPEC_FILE);
    const designPath = join(draftRoot, 'environment', DESIGN_SPEC_FILE);
    const assetsDir = join(draftRoot, 'environment', 'assets');
    const assets: TaskAssetInfo[] = [];

    if (existsSync(assetsDir)) {
      for (const f of readdirSync(assetsDir)) {
        if (f.startsWith('.')) continue;
        assets.push({ filename: f, relativePath: `environment/assets/${f}` });
      }
    }

    const designSpec = existsSync(designPath) ? readDesignSpecFile(designPath) : null;

    return {
      id,
      status: existsSync(join(draftRoot, '.complete')) ? 'complete' : 'draft',
      builderState,
      instruction: existsSync(instructionPath) ? readFileSync(instructionPath, 'utf8') : '',
      evalSpec: existsSync(evalPath)
        ? (normalizeEvalSpec(
            JSON.parse(readFileSync(evalPath, 'utf8')) as Record<string, unknown>
          ) as unknown as EvalSpec)
        : null,
      designSpec,
      designCompleted: builderState.design.completed,
      assets,
      checkCatalog: CHECK_CATALOG,
    };
  }

  patchTask(
    id: string,
    patch: {
      current_step?: WizardStep;
      metadata?: Partial<BuilderState['metadata']>;
      instruction?: string;
      evalSpec?: EvalSpec;
      design?: Partial<BuilderState['design']>;
    }
  ): FullTaskPayload {
    const state = this.readBuilderState(id);
    if (patch.current_step) state.current_step = patch.current_step;
    if (patch.metadata) state.metadata = { ...state.metadata, ...patch.metadata };
    if (patch.design) state.design = { ...state.design, ...patch.design };
    this.writeBuilderState(id, state);

    const root = draftPath(this.config, id);
    if (patch.instruction !== undefined) {
      writeFileSync(join(root, 'instruction.md'), patch.instruction, 'utf8');
    }
    if (patch.evalSpec !== undefined) {
      const toSave = prepareEvalSpecForSave(
        patch.evalSpec as unknown as Record<string, unknown>
      ) as unknown as EvalSpec;
      validateEvalSpec(this.config.evalSpecSchemaPath, toSave);
      writeFileSync(
        join(root, 'tests', EVAL_SPEC_FILE),
        JSON.stringify(toSave, null, 2) + '\n',
        'utf8'
      );
    }

    return this.getTask(id);
  }

  saveDesignSpec(
    id: string,
    body: { base: string; node_exclusions?: string[] }
  ): { saved: boolean } {
    const root = draftPath(this.config, id);
    if (!existsSync(root)) throw new Error(`NOT_FOUND: draft ${id}`);

    const base = normalizeDesignName(body.base);
    assertDesignBaseExists(this.config, base);

    const spec: DesignSpec = {
      schema_version: 1,
      base,
      ...(body.node_exclusions?.length ? { node_exclusions: body.node_exclusions } : {}),
    };
    validateDesignSpec(this.config.designSpecSchemaPath, spec);

    const envDir = join(root, 'environment');
    mkdirSync(envDir, { recursive: true });
    writeFileSync(join(envDir, DESIGN_SPEC_FILE), JSON.stringify(spec, null, 2) + '\n', 'utf8');

    const state = this.readBuilderState(id);
    state.design = {
      completed: true,
      base: spec.base,
      node_exclusions: spec.node_exclusions,
    };
    state.current_step = 'gates';
    this.writeBuilderState(id, state);

    return { saved: true };
  }

  deleteTask(id: string): void {
    const root = draftPath(this.config, id);
    if (!existsSync(root)) throw new Error(`NOT_FOUND: draft ${id}`);
    rmSync(root, { recursive: true, force: true });
  }

  async standaloneExport(hfcFileName: string, snapshot: unknown): Promise<{ filePath: string }> {
    const imported = await this.hfc.importSnapshot(hfcFileName, snapshot);
    return this.persistDesignExport(imported, { mode: 'new', designName: imported.slug });
  }

  persistDesignExport(
    imported: ImportHfcResponse,
    options: {
      mode: 'new' | 're';
      designName: string;
      reexportTarget?: string;
      exportId?: string;
    }
  ): { filePath: string } {
    const designName = normalizeDesignName(
      options.mode === 're'
        ? (options.reexportTarget ?? options.designName)
        : options.designName
    );
    this.validateSlug(designName);

    const designDir = join(this.config.designsDir, designName);
    const exists = existsSync(join(designDir, 'design.hfc.json'));

    if (options.mode === 'new' && exists) {
      throw new Error(`DESIGN_EXISTS: export "${designName}" already exists; use re-export to overwrite`);
    }
    if (options.mode === 're' && !exists) {
      throw new Error(`NOT_FOUND: design export "${designName}" not found for re-export`);
    }

    mkdirSync(designDir, { recursive: true });
    const filePath = join(designDir, 'design.hfc.json');
    writeJsonFile(filePath, imported.envelope);
    if (options.exportId) {
      logPersistDebug(options.exportId, imported, filePath);
    }

    writeDesignAssets(join(designDir, 'design.hfc.assets'), imported.assets);

    return { filePath };
  }

  saveAsset(id: string, filename: string, dataBase64: string): TaskAssetInfo {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
    if (!safe) throw new Error('INVALID_FILENAME');
    const dir = join(draftPath(this.config, id), 'environment', 'assets');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, safe), Buffer.from(dataBase64, 'base64'));
    return { filename: safe, relativePath: `environment/assets/${safe}` };
  }

  completeTask(id: string): { harborPath: string } {
    finalizeTask(this.config, id);
    return { harborPath: join(this.config.harborTasksDir, id) };
  }

  loadHarborAsDraft(harborId: string): BuilderState {
    const draftId = harborId;
    this.validateSlug(draftId);
    if (existsSync(draftPath(this.config, draftId))) {
      const completeMarker = join(draftPath(this.config, draftId), '.complete');
      if (existsSync(completeMarker)) {
        rmSync(completeMarker, { force: true });
      }
      return this.readBuilderState(draftId);
    }
    const harborRoot = join(this.config.harborTasksDir, harborId);
    if (!existsSync(harborRoot)) {
      throw new Error(`Harbor task not found: ${harborId}`);
    }
    cloneHarborToDraft(this.config, harborId, draftId);
    return this.readBuilderState(draftId);
  }
}
