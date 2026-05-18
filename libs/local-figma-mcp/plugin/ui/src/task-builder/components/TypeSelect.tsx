import { humanCheckType, humanVisualType } from '../catalog-helpers';
import type { CheckCatalog } from '../types';
import { FieldHelp } from './FieldHelp';

export interface TypeOption {
  value: string;
  label: string;
  description: string;
}

export function buildCheckOptions(catalog: CheckCatalog | null): TypeOption[] {
  const types = catalog?.checks.types ?? {};
  return Object.keys(types).map((value) => {
    const { label, description } = humanCheckType(value, catalog ?? undefined);
    return { value, label, description };
  });
}

export function buildVisualOptions(catalog: CheckCatalog | null): TypeOption[] {
  const types = catalog?.visual.types ?? {};
  return Object.keys(types).map((value) => {
    const { label, description } = humanVisualType(value, catalog ?? undefined);
    return { value, label, description };
  });
}

export function TypeSelect({
  options,
  value,
  onChange,
  id,
}: {
  options: TypeOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="space-y-1.5">
      <select
        id={id}
        className="w-full h-8 rounded border border-[#555] bg-[#1e1e1e] text-[11px] px-2 text-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {selected ? (
        <FieldHelp label={selected.label} description={selected.description} />
      ) : null}
    </div>
  );
}
