import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import {
  humanCheckType,
  humanEnumValue,
  humanFieldDescription,
  humanFieldLabel,
} from '../catalog-helpers';
import type { CheckCatalog } from '../types';
import { FieldHelp } from './FieldHelp';

const CHECK_FIELD_ORDER: Record<string, string[]> = {
  must_contain_text: ['contains', 'scope', 'node_id', 'case_sensitive', 'required'],
  must_contain_image: ['scope', 'node_id', 'image_hash', 'required'],
  min_added_under: ['parent_id', 'min', 'required'],
  min_modified_under: ['parent_id', 'min', 'required'],
  component_instances_under: ['scope_id', 'component_id', 'min_instances', 'required'],
  metadata_only_under: ['parent_id', 'required'],
  property_on_node: ['node_id', 'property', 'equals', 'required'],
};

const NODE_ID_KEYS = new Set(['node_id', 'parent_id', 'scope_id', 'component_id']);

function orderedKeys(type: string, check: Record<string, unknown>): string[] {
  const order = CHECK_FIELD_ORDER[type] ?? [];
  const present = Object.keys(check).filter((k) => !['id', 'type'].includes(k));
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const k of order) {
    if (present.includes(k)) {
      keys.push(k);
      seen.add(k);
    }
  }
  for (const k of present) {
    if (!seen.has(k)) keys.push(k);
  }
  return keys;
}

export function CheckCard({
  check,
  index,
  catalog,
  onChange,
  onRemove,
  onPickNode,
}: {
  check: Record<string, unknown>;
  index: number;
  catalog: CheckCatalog | null;
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onPickNode: (field: string) => void;
}) {
  const type = String(check.type);
  const { label, description } = humanCheckType(type, catalog ?? undefined);
  const keys = orderedKeys(type, check);

  return (
    <article className="rounded-md border border-[#444] bg-[#252525] overflow-hidden">
      <header className="flex items-start justify-between gap-2 px-2.5 py-2 border-b border-[#3a3a3a] bg-[#2a2a2a]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold m-0 text-foreground">
            {index + 1}. {label}
          </p>
          <p className="text-[10px] text-muted m-0 mt-0.5 leading-snug">{description}</p>
          <p className="text-[9px] text-muted/80 m-0 mt-1 font-mono">{String(check.id)}</p>
        </div>
        <Button size="sm" variant="ghost" type="button" onClick={onRemove} className="shrink-0 text-destructive">
          Remove
        </Button>
      </header>

      <div className="p-2.5 space-y-3">
        {keys.map((key) => {
          const value = check[key];
          const fieldLabel = humanFieldLabel(key, catalog ?? undefined, 'checks', type);
          const fieldDesc = humanFieldDescription(key, catalog ?? undefined, 'checks', type);

          if (key === 'required' || key === 'case_sensitive') {
            return (
              <div key={key} className="flex items-start gap-2">
                <Switch
                  checked={key === 'required' ? value !== false : !!value}
                  onCheckedChange={(v) => onChange({ [key]: v })}
                />
                <FieldHelp label={fieldLabel} description={fieldDesc} />
              </div>
            );
          }

          if (key === 'scope' || key === 'focus') {
            const options =
              key === 'scope'
                ? ['new_frames', 'node_id']
                : ['largest_added', 'added', 'all'];
            return (
              <div key={key} className="space-y-1">
                <FieldHelp label={fieldLabel} description={fieldDesc} />
                <select
                  className="w-full h-8 rounded border border-[#555] bg-[#1e1e1e] text-[11px] px-2"
                  value={String(value ?? '')}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {humanEnumValue(key, opt)}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (key === 'min' || key === 'min_instances') {
            return (
              <div key={key} className="space-y-1">
                <FieldHelp label={fieldLabel} description={fieldDesc} />
                <Input
                  type="number"
                  min={1}
                  value={String(value ?? '')}
                  onChange={(e) => onChange({ [key]: Number(e.target.value) })}
                />
              </div>
            );
          }

          if (key === 'equals') {
            return (
              <div key={key} className="space-y-1">
                <FieldHelp label={fieldLabel} description={fieldDesc} />
                <Textarea
                  rows={2}
                  className="min-h-[48px] font-mono text-[10px]"
                  value={typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                  onChange={(e) => {
                    try {
                      onChange({ [key]: JSON.parse(e.target.value) });
                    } catch {
                      onChange({ [key]: e.target.value });
                    }
                  }}
                />
              </div>
            );
          }

          return (
            <div key={key} className="space-y-1">
              <FieldHelp label={fieldLabel} description={fieldDesc} />
              <Input
                value={typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
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
