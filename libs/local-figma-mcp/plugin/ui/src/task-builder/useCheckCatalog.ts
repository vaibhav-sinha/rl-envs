import { useEffect, useState } from 'react';
import { taskBuilderApi } from '../api/taskBuilder';
import type { CheckCatalog } from './types';

/** Reject eval-spec-shaped objects mistaken for the SME catalog. */
export function isCheckCatalog(value: unknown): value is CheckCatalog {
  if (!value || typeof value !== 'object') return false;
  const v = value as CheckCatalog;
  return (
    typeof v.gates?.title === 'string' &&
    typeof v.checks?.title === 'string' &&
    v.checks?.types != null &&
    typeof v.design_system?.title === 'string' &&
    typeof v.visual?.title === 'string' &&
    typeof v.metadata_checks?.title === 'string' &&
    typeof v.category_importance?.title === 'string'
  );
}

export function useCheckCatalog(initial?: unknown) {
  const [catalog, setCatalog] = useState<CheckCatalog | null>(
    isCheckCatalog(initial) ? initial : null
  );

  useEffect(() => {
    if (isCheckCatalog(initial)) {
      setCatalog(initial);
    }
  }, [initial]);

  useEffect(() => {
    if (isCheckCatalog(catalog)) return;
    let cancelled = false;
    void taskBuilderApi.getCheckCatalog().then((c) => {
      if (!cancelled && isCheckCatalog(c)) setCatalog(c);
    });
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  return catalog;
}
