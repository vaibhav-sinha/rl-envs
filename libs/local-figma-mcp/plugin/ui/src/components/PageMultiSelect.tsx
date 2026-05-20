import type { FilePageInfo } from '../lib/plugin-bridge';
import { Label } from './ui/label';

export function PageMultiSelect({
  pages,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  onRefresh,
  disabled,
  loading,
  error,
}: {
  pages: FilePageInfo[];
  selectedIds: Set<string>;
  onToggle: (pageId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>Pages to export</Label>
        <div className="flex gap-2 text-[10px]">
          <button
            type="button"
            className="text-accent hover:underline disabled:opacity-50 disabled:no-underline"
            disabled={disabled || loading || pages.length === 0}
            onClick={onSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-muted hover:underline disabled:opacity-50 disabled:no-underline"
            disabled={disabled || loading}
            onClick={onClearAll}
          >
            Clear all
          </button>
          {onRefresh ? (
            <button
              type="button"
              className="text-muted hover:underline disabled:opacity-50 disabled:no-underline"
              disabled={disabled || loading}
              onClick={onRefresh}
            >
              Refresh
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-[10px] text-destructive m-0">{error}</p> : null}
      {loading ? (
        <p className="text-[10px] text-muted m-0">Loading pages…</p>
      ) : pages.length === 0 ? (
        <p className="text-[10px] text-muted m-0">No pages found in this file.</p>
      ) : (
        <div className="max-h-[140px] overflow-auto border border-border rounded p-1.5 space-y-0.5">
          {pages.map((page) => (
            <label
              key={page.id}
              className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[#2a2a2a] cursor-pointer text-[11px]"
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={selectedIds.has(page.id)}
                disabled={disabled}
                onChange={() => onToggle(page.id)}
              />
              <span className="truncate text-foreground">{page.name}</span>
            </label>
          ))}
        </div>
      )}
      {!loading && selectedIds.size === 0 && pages.length > 0 ? (
        <p className="text-[10px] text-destructive m-0">Select at least one page to export.</p>
      ) : null}
    </div>
  );
}
