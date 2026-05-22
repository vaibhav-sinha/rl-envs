import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SerializedNodeWire } from './stream-protocol.js';

const SHELL_FIELDS = ['fills', 'strokes', 'backgrounds', 'effects'] as const;

export function exportDebugEnabled(): boolean {
  return process.env.TB_EXPORT_DEBUG === '1';
}

export interface InstanceShellSummary {
  nodeId: string;
  name: string;
  type: string;
  propKeys: string[];
  fills?: unknown;
  strokes?: unknown;
  backgrounds?: unknown;
  effects?: unknown;
  overrides?: unknown;
}

function shellSummary(
  nodeId: string,
  name: string,
  type: string,
  properties: Record<string, unknown>
): InstanceShellSummary {
  const propKeys = SHELL_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(properties, f));
  const out: InstanceShellSummary = { nodeId, name, type, propKeys };
  if (propKeys.includes('fills')) out.fills = properties.fills;
  if (propKeys.includes('strokes')) out.strokes = properties.strokes;
  if (propKeys.includes('backgrounds')) out.backgrounds = properties.backgrounds;
  if (propKeys.includes('effects')) out.effects = properties.effects;
  if (Object.prototype.hasOwnProperty.call(properties, 'overrides')) {
    out.overrides = properties.overrides;
  }
  return out;
}

function shouldTraceInstance(type: string, properties: Record<string, unknown>): boolean {
  if (type !== 'INSTANCE') return false;
  if (SHELL_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(properties, f))) return true;
  if (Object.prototype.hasOwnProperty.call(properties, 'overrides')) return true;
  return false;
}

export class ExportInstanceDebugLog {
  private readonly lines: string[] = [];

  log(stage: string, detail: string): void {
    if (!exportDebugEnabled()) return;
    const line = `[tb-export-debug] ${stage} ${detail}`;
    this.lines.push(line);
    console.warn(line);
  }

  logInstanceShell(stage: string, nodeId: string, name: string, type: string, properties: Record<string, unknown>): void {
    if (!exportDebugEnabled() || !shouldTraceInstance(type, properties)) return;
    const s = shellSummary(nodeId, name, type, properties);
    this.log(stage, `${nodeId} "${name}" props=[${s.propKeys.join(',')}] fills=${fmt(s.fills)} strokes=${fmt(s.strokes)} overrides=${s.overrides ? 'yes' : 'no'}`);
  }

  logWirePart(stage: string, part: { kind: string; node?: SerializedNodeWire; nodeId?: string; properties?: Record<string, unknown> }): void {
    if (!exportDebugEnabled()) return;
    if (part.kind === 'tree_enter' && part.node) {
      this.logInstanceShell(stage, part.node.id, part.node.name, part.node.type, part.node.properties);
      return;
    }
    if (part.kind === 'node_props' && part.nodeId && part.properties) {
      const node = { id: part.nodeId, name: '?', type: 'INSTANCE', properties: part.properties };
      this.logInstanceShell(stage, node.id, node.name, node.type, node.properties);
    }
  }

  walkAssembledDocument(stage: string, document: SerializedNodeWire & { children?: SerializedNodeWire[] }): void {
    if (!exportDebugEnabled()) return;
    const walk = (n: SerializedNodeWire & { children?: SerializedNodeWire[] }): void => {
      if (n.type === 'INSTANCE') {
        this.logInstanceShell(stage, n.id, n.name, n.type, n.properties);
      }
      for (const c of n.children ?? []) walk(c);
    };
    walk(document);
  }

  walkImportEnvelope(stage: string, envelope: unknown): void {
    if (!exportDebugEnabled() || !envelope || typeof envelope !== 'object') return;
    const doc = (envelope as { document?: { children?: unknown[] } }).document;
    if (!doc) return;
    this.walkHfcDocument(stage, doc);
  }

  walkHfcDocument(stage: string, document: { children?: unknown[] }): void {
    if (!exportDebugEnabled()) return;
    const walk = (nodes: unknown[]): void => {
      for (const n of nodes) {
        if (!n || typeof n !== 'object') continue;
        const o = n as Record<string, unknown>;
        if (o.type === 'INSTANCE' && typeof o.sourceFigmaId === 'string') {
          const props: Record<string, unknown> = {};
          for (const f of SHELL_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(o, f)) props[f] = o[f];
          }
          if (Object.prototype.hasOwnProperty.call(o, 'overrides')) props.overrides = o.overrides;
          this.logInstanceShell(stage, o.sourceFigmaId as string, String(o.name ?? ''), 'INSTANCE', props);
        }
        if (Array.isArray(o.children)) walk(o.children);
      }
    };
    for (const page of document.children ?? []) {
      if (page && typeof page === 'object' && Array.isArray((page as { children?: unknown[] }).children)) {
        walk((page as { children: unknown[] }).children);
      }
    }
  }

  flush(sessionDir: string | undefined): void {
    if (!exportDebugEnabled() || this.lines.length === 0) return;
    if (sessionDir) {
      try {
        writeFileSync(join(sessionDir, 'export-instance-debug.log'), `${this.lines.join('\n')}\n`, 'utf8');
      } catch {
        /* session dir may be deleted */
      }
    }
  }
}

function fmt(v: unknown): string {
  if (v === undefined) return 'absent';
  if (Array.isArray(v)) return `array(${v.length})`;
  return typeof v;
}

/** Per-export session debug accumulator (keyed by exportId). */
const logsByExport = new Map<string, ExportInstanceDebugLog>();

export function debugLogForExport(exportId: string): ExportInstanceDebugLog {
  let log = logsByExport.get(exportId);
  if (!log) {
    log = new ExportInstanceDebugLog();
    logsByExport.set(exportId, log);
  }
  return log;
}

export function clearDebugLogForExport(exportId: string): void {
  logsByExport.delete(exportId);
}
