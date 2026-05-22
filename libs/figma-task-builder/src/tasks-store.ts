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
import { basename, join } from 'node:path';
import { CHECK_CATALOG } from './check-catalog.js';
import type { TaskBuilderConfig } from './config.js';
import { buildDefaultInstruction } from './instruction-preamble.js';
import { normalizeEvalSpec, prepareEvalSpecForSave } from './category-importance.js';
import { defaultEvalSpec, validateEvalSpec } from './eval-spec-validator.js';
import { debugLogForExport, exportDebugEnabled } from './export-instance-debug.js';
import { HfcClient, type ImportHfcResponse } from './hfc-client.js';
import { writeJsonFile } from './write-json-stream.js';

function logPersistDebug(exportId: string, imported: ImportHfcResponse, filePath: string): void {
  if (!exportDebugEnabled()) return;
  const dbg = debugLogForExport(exportId);
  dbg.walkImportEnvelope('persist_disk_envelope', imported.envelope);
  dbg.log('persist', `wrote ${filePath}`);
}
import { cloneHarborToDraft, finalizeTask } from './finalize.js';
import { envelopeHasSourceFigmaIds, pruneEnvelopeBySourceFigmaIds } from './prune-hfc.js';
import { remapEvalSpecIds } from './remap-eval-spec.js';
import type {
  BuilderState,
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

function nowIso(): string {
  return new Date().toISOString();
}

function draftPath(config: TaskBuilderConfig, id: string): string {
  return join(config.tasksDir, id);
}

function designHfcPath(config: TaskBuilderConfig, taskId: string): string | null {
  const draft = join(draftPath(config, taskId), 'environment', 'design.hfc.json');
  if (existsSync(draft)) return draft;
  const harbor = join(config.harborTasksDir, taskId, 'environment', 'design.hfc.json');
  if (existsSync(harbor)) return harbor;
  return null;
}

function designAssetsDir(config: TaskBuilderConfig, taskId: string): string | null {
  const draft = join(draftPath(config, taskId), 'environment', 'design.hfc.assets');
  if (existsSync(draft)) return draft;
  const harbor = join(config.harborTasksDir, taskId, 'environment', 'design.hfc.assets');
  if (existsSync(harbor)) return harbor;
  return null;
}

function hasDesignExport(config: TaskBuilderConfig, taskId: string): boolean {
  return designHfcPath(config, taskId) !== null;
}

export class TasksStore {
  private readonly hfc: HfcClient;

  constructor(private readonly config: TaskBuilderConfig) {
    this.hfc = new HfcClient(config.hfcUrl);
    mkdirSync(config.tasksDir, { recursive: true });
    mkdirSync(config.harborTasksDir, { recursive: true });
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
          has_design_export: hasDesignExport(this.config, state.id),
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
          has_design_export: hasDesignExport(this.config, name),
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
        verifier_timeout_sec: 300,
        agent_timeout_sec: 600,
      },
      export: { completed: false, mode: null },
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
    const assetsDir = join(draftRoot, 'environment', 'assets');
    const assets: TaskAssetInfo[] = [];

    if (existsSync(assetsDir)) {
      for (const f of readdirSync(assetsDir)) {
        if (f.startsWith('.')) continue;
        assets.push({ filename: f, relativePath: `environment/assets/${f}` });
      }
    }

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
      exportCompleted: builderState.export.completed,
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
      export?: Partial<BuilderState['export']>;
    }
  ): FullTaskPayload {
    const state = this.readBuilderState(id);
    if (patch.current_step) state.current_step = patch.current_step;
    if (patch.metadata) state.metadata = { ...state.metadata, ...patch.metadata };
    if (patch.export) state.export = { ...state.export, ...patch.export };
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

  deleteTask(id: string): void {
    const root = draftPath(this.config, id);
    if (!existsSync(root)) throw new Error(`NOT_FOUND: draft ${id}`);
    rmSync(root, { recursive: true, force: true });
  }

  private writeDesignFromImport(
    root: string,
    envelope: unknown,
    assets: Array<{ hash: string; mimeType: string; base64: string }>
  ): void {
    const envDir = join(root, 'environment');
    mkdirSync(envDir, { recursive: true });

    const designPath = join(envDir, 'design.hfc.json');
    writeJsonFile(designPath, envelope);

    const sidecarName = `${basename(designPath, '.hfc.json')}.hfc.assets`;
    const sidecarDir = join(envDir, sidecarName);
    mkdirSync(sidecarDir, { recursive: true });

    for (const asset of assets) {
      const ext =
        asset.mimeType === 'image/png'
          ? 'png'
          : asset.mimeType === 'image/jpeg'
            ? 'jpg'
            : asset.mimeType === 'image/webp'
              ? 'webp'
              : asset.mimeType === 'image/svg+xml'
                ? 'svg'
                : 'gif';
      const buf = Buffer.from(asset.base64, 'base64');
      writeFileSync(join(sidecarDir, `${asset.hash}.${ext}`), buf);
    }
  }

  private copyDesignAssetsSidecar(sourceTaskId: string, targetRoot: string): void {
    const sourceAssets = designAssetsDir(this.config, sourceTaskId);
    if (!sourceAssets) return;

    const targetDir = join(targetRoot, 'environment', 'design.hfc.assets');
    mkdirSync(join(targetRoot, 'environment'), { recursive: true });
    cpSync(sourceAssets, targetDir, { recursive: true });
  }

  async exportTask(
    id: string,
    body: {
      snapshot: unknown;
      mode: 'full' | 'exclude';
      excludeNodeIds?: string[];
    }
  ): Promise<{ saved: boolean }> {
    const root = draftPath(this.config, id);
    if (!existsSync(root)) throw new Error(`NOT_FOUND: draft ${id}`);

    const imported = await this.hfc.importSnapshot(id, body.snapshot);
    this.writeDesignFromImport(root, imported.envelope, imported.assets);

    const evalSpecPath = join(root, 'tests', EVAL_SPEC_FILE);
    if (existsSync(evalSpecPath) && imported.figmaToHfc) {
      const spec = JSON.parse(readFileSync(evalSpecPath, 'utf8')) as EvalSpec;
      const remapped = remapEvalSpecIds(spec, imported.figmaToHfc);
      validateEvalSpec(this.config.evalSpecSchemaPath, remapped);
      writeFileSync(evalSpecPath, JSON.stringify(remapped, null, 2) + '\n', 'utf8');
    }

    const state = this.readBuilderState(id);
    state.export = {
      completed: true,
      mode: body.mode,
      excludeNodeIds: body.excludeNodeIds,
    };
    state.current_step = 'gates';
    this.writeBuilderState(id, state);

    return { saved: true };
  }

  async copyExportTask(
    id: string,
    body: {
      copyFromTaskId: string;
      excludeFigmaNodeIds?: string[];
    }
  ): Promise<{ saved: boolean; has_source_figma_ids: boolean; exclusions_applied: boolean }> {
    const root = draftPath(this.config, id);
    if (!existsSync(root)) throw new Error(`NOT_FOUND: draft ${id}`);

    const copyFrom = body.copyFromTaskId.trim();
    this.validateSlug(copyFrom);
    if (copyFrom === id) {
      throw new Error('INVALID_COPY: cannot copy design export from the same task');
    }

    const sourcePath = designHfcPath(this.config, copyFrom);
    if (!sourcePath) {
      throw new Error(`NO_DESIGN_EXPORT: task "${copyFrom}" has no design.hfc.json`);
    }

    let envelope = JSON.parse(readFileSync(sourcePath, 'utf8')) as Parameters<
      typeof pruneEnvelopeBySourceFigmaIds
    >[0];
    const hasSourceFigmaIds = envelopeHasSourceFigmaIds(envelope);
    const excludeIds = body.excludeFigmaNodeIds ?? [];
    const exclusionsApplied = excludeIds.length > 0 && hasSourceFigmaIds;

    if (exclusionsApplied) {
      envelope = pruneEnvelopeBySourceFigmaIds(envelope, excludeIds);
    }

    const envDir = join(root, 'environment');
    mkdirSync(envDir, { recursive: true });
    writeFileSync(join(envDir, 'design.hfc.json'), JSON.stringify(envelope, null, 2) + '\n', 'utf8');
    this.copyDesignAssetsSidecar(copyFrom, root);

    const state = this.readBuilderState(id);
    state.export = {
      completed: true,
      mode: 'copy',
      copyFromTaskId: copyFrom,
      excludeFigmaNodeIds: excludeIds.length > 0 ? excludeIds : undefined,
    };
    state.current_step = 'gates';
    this.writeBuilderState(id, state);

    return { saved: true, has_source_figma_ids: hasSourceFigmaIds, exclusions_applied: exclusionsApplied };
  }

  async standaloneExport(hfcFileName: string, snapshot: unknown): Promise<{ filePath: string }> {
    const imported = await this.hfc.importSnapshot(hfcFileName, snapshot);
    return this.persistStandaloneImport(imported);
  }

  persistStandaloneImport(imported: ImportHfcResponse, exportId?: string): { filePath: string } {
    mkdirSync(this.config.exportDir, { recursive: true });
    const filePath = join(this.config.exportDir, `${imported.slug}.hfc.json`);
    writeJsonFile(filePath, imported.envelope);
    if (exportId) {
      logPersistDebug(exportId, imported, filePath);
    }

    const sidecarDir = join(this.config.exportDir, `${imported.slug}.hfc.assets`);
    mkdirSync(sidecarDir, { recursive: true });
    for (const asset of imported.assets) {
      const ext =
        asset.mimeType === 'image/png'
          ? 'png'
          : asset.mimeType === 'image/jpeg'
            ? 'jpg'
            : asset.mimeType === 'image/webp'
              ? 'webp'
              : asset.mimeType === 'image/svg+xml'
                ? 'svg'
                : 'gif';
      writeFileSync(join(sidecarDir, `${asset.hash}.${ext}`), Buffer.from(asset.base64, 'base64'));
    }

    return { filePath };
  }

  applyTaskExportImport(
    taskId: string,
    imported: ImportHfcResponse,
    mode: 'full' | 'exclude',
    excludeNodeIds?: string[]
  ): { saved: boolean } {
    const root = draftPath(this.config, taskId);
    if (!existsSync(root)) throw new Error(`NOT_FOUND: draft ${taskId}`);

    this.writeDesignFromImport(root, imported.envelope, imported.assets);

    const evalSpecPath = join(root, 'tests', EVAL_SPEC_FILE);
    if (existsSync(evalSpecPath) && imported.figmaToHfc) {
      const spec = JSON.parse(readFileSync(evalSpecPath, 'utf8')) as EvalSpec;
      const remapped = remapEvalSpecIds(spec, imported.figmaToHfc);
      validateEvalSpec(this.config.evalSpecSchemaPath, remapped);
      writeFileSync(evalSpecPath, JSON.stringify(remapped, null, 2) + '\n', 'utf8');
    }

    const state = this.readBuilderState(taskId);
    state.export = {
      completed: true,
      mode,
      excludeNodeIds,
    };
    state.current_step = 'gates';
    this.writeBuilderState(taskId, state);

    return { saved: true };
  }

  saveAsset(id: string, filename: string, dataBase64: string): TaskAssetInfo {
    const safe = basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safe || safe.startsWith('.')) throw new Error('INVALID_FILENAME');
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
