import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { captureScreenshot } from '../../lib/plugin-bridge';
import {
  humanEnumValue,
  humanFieldDescription,
  humanFieldLabel,
  humanVisualType,
} from '../catalog-helpers';
import type { CheckCatalog } from '../types';
import { FieldHelp } from './FieldHelp';

const VISUAL_FIELD_ORDER: Record<string, string[]> = {
  design_consistency: [
    'node_id',
    'surrounding_context_node_id',
    'consistency_criteria',
    'fit_criteria',
    'focus',
  ],
  task_completeness: ['evaluation_instructions', 'node_id'],
  before_vs_after: ['surrounding_context_node_id'],
  diff: [],
  compare_with_reference: ['reference_asset'],
};

const NODE_ID_KEYS = new Set(['node_id', 'surrounding_context_node_id']);

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
  const { label, description } = humanVisualType(type, catalog ?? undefined);
  const keys = orderedKeys(type, visual);

  return (
    <article className="rounded-md border border-[#444] bg-[#252525] overflow-hidden">
      <header className="flex items-start justify-between gap-2 px-2.5 py-2 border-b border-[#3a3a3a] bg-[#2a2a2a]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold m-0 text-foreground">
            {index + 1}. {label}
          </p>
          <p className="text-[10px] text-muted m-0 mt-0.5 leading-snug">{description}</p>
          <p className="text-[9px] text-muted/80 m-0 mt-1 font-mono">{String(visual.id)}</p>
        </div>
        <Button size="sm" variant="ghost" type="button" onClick={onRemove} className="shrink-0 text-destructive">
          Remove
        </Button>
      </header>

      <div className="p-2.5 space-y-3">
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

          if (key === 'evaluation_instructions') {
            return (
              <div key={key} className="space-y-1">
                <FieldHelp
                  label="Additional judge instructions"
                  description={
                    fieldDesc ??
                    'Optional. Appended to the agent instruction when the LLM judges task completeness. Use this to clarify edge cases the agent instruction does not cover.'
                  }
                />
                <Textarea
                  rows={4}
                  placeholder="e.g. Treat icon-only buttons as valid. Ignore placeholder lorem ipsum."
                  value={String(value ?? '')}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                />
              </div>
            );
          }

          if (key === 'focus') {
            const options = ['largest_added', 'added', 'all'];
            return (
              <div key={key} className="space-y-1">
                <FieldHelp label={fieldLabel} description={fieldDesc} />
                <select
                  className="w-full h-8 rounded border border-[#555] bg-[#1e1e1e] text-[11px] px-2"
                  value={String(value ?? 'largest_added')}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {humanEnumValue('focus', opt)}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (key === 'consistency_criteria' || key === 'fit_criteria') {
            return (
              <div key={key} className="space-y-1">
                <FieldHelp label={fieldLabel} description={fieldDesc ?? 'One criterion per line.'} />
                <Textarea
                  rows={3}
                  placeholder="One line per criterion"
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

        {type === 'diff' ? (
          <p className="text-[10px] text-muted m-0">
            No extra settings — the verifier sends a textual diff summary to the LLM.
          </p>
        ) : null}
      </div>
    </article>
  );
}
