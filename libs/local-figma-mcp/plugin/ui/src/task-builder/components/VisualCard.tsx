import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { captureScreenshot } from '../../lib/plugin-bridge';
import {
  humanFieldDescription,
  humanFieldLabel,
  humanVisualType,
} from '../catalog-helpers';
import { AUTO_VISUAL_TYPES, DEFAULT_DESIGN_FIT_PROMPT } from '../default-visual-checks';
import type { CheckCatalog } from '../types';
import { FieldHelp } from './FieldHelp';

const VISUAL_FIELD_ORDER: Record<string, string[]> = {
  good_design: [],
  design_consistency: ['reference_asset', 'criteria'],
  design_fit: ['node_id', 'evaluation_prompt'],
  task_completeness: ['evaluation_instructions', 'node_id'],
  design_preference: ['reference_asset'],
};

const NODE_ID_KEYS = new Set(['node_id']);

function orderedKeys(type: string, visual: Record<string, unknown>): string[] {
  const order = VISUAL_FIELD_ORDER[type] ?? [];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const k of order) {
    keys.push(k);
    seen.add(k);
  }
  for (const k of Object.keys(visual)) {
    if (!['id', 'type'].includes(k) && !seen.has(k)) keys.push(k);
  }
  return keys;
}

function linesFromArray(val: unknown): string {
  if (Array.isArray(val)) return val.join('\n');
  return typeof val === 'string' ? val : '';
}

export function VisualCard({
  visual,
  index,
  catalog,
  taskInstruction,
  taskId,
  onChange,
  onRemove,
  onPickNode,
  onLog,
}: {
  visual: Record<string, unknown>;
  index: number;
  catalog: CheckCatalog | null;
  taskInstruction?: string;
  taskId: string | null;
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onPickNode: (field: string) => void;
  onLog: (msg: string, err?: boolean) => void;
}) {
  const type = String(visual.type);
  const isAuto = (AUTO_VISUAL_TYPES as readonly string[]).includes(type);
  const { label, description } = humanVisualType(type, catalog ?? undefined);
  const keys = orderedKeys(type, visual);

  return (
    <article className="rounded-md border border-[#444] bg-[#252525] overflow-hidden">
      <header className="flex items-start justify-between gap-2 px-2.5 py-2 border-b border-[#3a3a3a] bg-[#2a2a2a]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold m-0 text-foreground">
            {index + 1}. {label}
            {isAuto ? (
              <span className="ml-1.5 text-[9px] font-normal text-muted uppercase tracking-wide">
                (default)
              </span>
            ) : null}
          </p>
          <p className="text-[10px] text-muted m-0 mt-0.5 leading-snug">{description}</p>
          <p className="text-[9px] text-muted/80 m-0 mt-1 font-mono">{String(visual.id)}</p>
        </div>
        {!isAuto ? (
          <Button size="sm" variant="ghost" type="button" onClick={onRemove} className="shrink-0 text-destructive">
            Remove
          </Button>
        ) : null}
      </header>

      <div className="p-2.5 space-y-3">
        {type === 'good_design' ? (
          <p className="text-[10px] text-muted m-0">
            Uses a built-in rubric (typography, spacing, color, overflow, alignment, hierarchy) on the
            largest change region. No configuration needed.
          </p>
        ) : null}

        {type === 'task_completeness' ? (
          <div className="rounded border border-[#3a3a3a] bg-[#1e1e1e] px-2 py-1.5 space-y-1">
            <p className="text-[10px] font-medium m-0 text-foreground">Agent instruction (from step 2)</p>
            <p className="text-[10px] text-muted m-0 leading-snug whitespace-pre-wrap">
              {taskInstruction?.trim()
                ? taskInstruction.trim().slice(0, 280) + (taskInstruction.length > 280 ? '…' : '')
                : 'No instruction saved yet — go back to the Instruction step.'}
            </p>
          </div>
        ) : null}

        {keys.map((key) => {
          const value = visual[key];
          const fieldLabel = humanFieldLabel(key, catalog ?? undefined, 'visual', type);
          const fieldDesc = humanFieldDescription(key, catalog ?? undefined, 'visual', type);

          if (key === 'evaluation_instructions' || key === 'evaluation_prompt') {
            const isFit = key === 'evaluation_prompt';
            return (
              <div key={key} className="space-y-1">
                <FieldHelp
                  label={isFit ? 'Evaluation prompt' : 'Additional judge instructions'}
                  description={
                    fieldDesc ??
                    (isFit
                      ? 'Instructions for the before/after fit judge.'
                      : 'Optional. Appended to the agent instruction when judging task completeness.')
                  }
                />
                <Textarea
                  rows={4}
                  placeholder={
                    isFit
                      ? DEFAULT_DESIGN_FIT_PROMPT
                      : 'e.g. Treat icon-only buttons as valid. Ignore placeholder lorem ipsum.'
                  }
                  value={String(value ?? (isFit ? DEFAULT_DESIGN_FIT_PROMPT : ''))}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                />
              </div>
            );
          }

          if (key === 'criteria') {
            return (
              <div key={key} className="space-y-1">
                <FieldHelp
                  label={fieldLabel}
                  description={fieldDesc ?? 'One criterion per line. Each is scored 1–5 and averaged.'}
                />
                <Textarea
                  rows={4}
                  placeholder={'The new screen should use the same background pattern as the reference\nThe new screen should have a keyboard at the bottom'}
                  value={linesFromArray(value)}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    onChange({ [key]: lines.length ? lines : undefined });
                  }}
                />
              </div>
            );
          }

          if (key === 'reference_asset') {
            return (
              <div key={key} className="space-y-1">
                <FieldHelp label={fieldLabel} description={fieldDesc} />
                <Input value={String(value ?? '')} onChange={(e) => onChange({ [key]: e.target.value })} />
                <Button
                  size="sm"
                  type="button"
                  onClick={() =>
                    void captureScreenshot()
                      .then(async (data) => {
                        if (!taskId) return;
                        const { taskBuilderApi } = await import('../../api/taskBuilder');
                        const fn = `ref-${String(visual.id)}.png`;
                        await taskBuilderApi.uploadAsset(taskId, fn, data);
                        onChange({ reference_asset: fn });
                        onLog(`Saved reference ${fn}`);
                      })
                      .catch((err) => onLog(String(err), true))
                  }
                >
                  Screenshot selection as reference
                </Button>
              </div>
            );
          }

          return (
            <div key={key} className="space-y-1">
              <FieldHelp label={fieldLabel} description={fieldDesc} />
              <Input
                value={String(value ?? '')}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
              {NODE_ID_KEYS.has(key) ? (
                <Button size="sm" type="button" onClick={() => onPickNode(key)}>
                  Pick from Figma selection
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
