import { describe, expect, it } from 'vitest';
import {
  normalizeEvalSpec,
  prepareEvalSpecForSave,
  resolveCategoryImportance,
} from '../src/category-importance.js';

describe('category importance', () => {
  it('merges legacy weights and strips gates', () => {
    const spec = {
      schema_version: 1 as const,
      weights: { gates: 99, checks: 0.5, visual: 0.1 },
    };
    expect(resolveCategoryImportance(spec)).toMatchObject({
      checks: 0.5,
      visual: 0.1,
    });
    expect(resolveCategoryImportance(spec).gates).toBeUndefined();
  });

  it('prefers category_importance over legacy weights', () => {
    const spec = {
      schema_version: 1 as const,
      weights: { checks: 0.1 },
      category_importance: { checks: 0.9 },
    };
    expect(resolveCategoryImportance(spec).checks).toBe(0.9);
  });

  it('normalizeEvalSpec removes weights', () => {
    const normalized = normalizeEvalSpec({
      schema_version: 1,
      weights: { checks: 0.4 },
    });
    expect(normalized.weights).toBeUndefined();
    expect(normalized.category_importance?.checks).toBe(0.4);
  });

  it('prepareEvalSpecForSave matches normalize', () => {
    const saved = prepareEvalSpecForSave({
      schema_version: 1,
      category_importance: { visual: 0.8 },
    });
    expect(saved.category_importance?.visual).toBe(0.8);
    expect(saved.weights).toBeUndefined();
  });
});
