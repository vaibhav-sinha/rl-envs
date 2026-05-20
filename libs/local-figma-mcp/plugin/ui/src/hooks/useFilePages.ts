import { useCallback, useEffect, useState } from 'react';
import { fetchFilePages, type FilePageInfo } from '../lib/plugin-bridge';

export function useFilePages() {
  const [pages, setPages] = useState<FilePageInfo[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchFilePages();
      setPages(list);
      setSelectedPageIds((prev) => {
        if (prev.size === 0) return new Set(list.map((p) => p.id));
        const next = new Set<string>();
        for (const p of list) {
          if (prev.has(p.id)) next.add(p.id);
        }
        return next.size > 0 ? next : new Set(list.map((p) => p.id));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectAll = useCallback(() => {
    setSelectedPageIds(new Set(pages.map((p) => p.id)));
  }, [pages]);

  const clearAll = useCallback(() => {
    setSelectedPageIds(new Set());
  }, []);

  const togglePage = useCallback((pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  return {
    pages,
    selectedPageIds,
    setSelectedPageIds,
    loading,
    error,
    refresh,
    selectAll,
    clearAll,
    togglePage,
    hasSelection: selectedPageIds.size > 0,
    allSelected: pages.length > 0 && selectedPageIds.size === pages.length,
  };
}
