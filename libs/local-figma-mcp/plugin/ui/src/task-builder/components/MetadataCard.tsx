import { Button } from '../../components/ui/button';
import { humanMetadataType } from '../catalog-helpers';
import type { CheckCatalog } from '../types';

export function MetadataCard({
  entry,
  index,
  catalog,
  onRemove,
}: {
  entry: Record<string, unknown>;
  index: number;
  catalog: CheckCatalog | null;
  onRemove: () => void;
}) {
  const type = String(entry.type);
  const { label, description } = humanMetadataType(type, catalog ?? undefined);

  return (
    <article className="rounded-md border border-[#444] bg-[#252525] overflow-hidden">
      <header className="flex items-start justify-between gap-2 px-2.5 py-2 border-b border-[#3a3a3a] bg-[#2a2a2a]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold m-0 text-foreground">
            {index + 1}. {label}
          </p>
          <p className="text-[10px] text-muted m-0 mt-0.5 leading-snug">{description}</p>
          <p className="text-[9px] text-muted/80 m-0 mt-1 font-mono">{String(entry.id)}</p>
        </div>
        <Button size="sm" variant="ghost" type="button" onClick={onRemove} className="shrink-0 text-destructive">
          Remove
        </Button>
      </header>
      <div className="p-2.5">
        {type === 'diff' ? (
          <p className="text-[10px] text-muted m-0">
            No extra settings — the verifier sends a textual diff summary to the LLM.
          </p>
        ) : null}
      </div>
    </article>
  );
}
