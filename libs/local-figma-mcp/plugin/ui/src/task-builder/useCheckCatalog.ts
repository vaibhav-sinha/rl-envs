import { useEffect, useState } from 'react';
import { taskBuilderApi } from '../api/taskBuilder';
import type { CheckCatalog } from './types';

export function useCheckCatalog(initial?: unknown) {
  const [catalog, setCatalog] = useState<CheckCatalog | null>(
    initial && typeof initial === 'object' ? (initial as CheckCatalog) : null
  );

  useEffect(() => {
    if (initial && typeof initial === 'object') {
      setCatalog(initial as CheckCatalog);
    }
  }, [initial]);

  useEffect(() => {
    if (catalog) return;
    let cancelled = false;
    void taskBuilderApi.getCheckCatalog().then((c) => {
      if (!cancelled) setCatalog(c);
    });
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  return catalog;
}
