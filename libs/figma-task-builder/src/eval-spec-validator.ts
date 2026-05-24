import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DEFAULT_CATEGORY_IMPORTANCE } from './category-importance.js';
import type { EvalSpec } from './types.js';

const require = createRequire(import.meta.url);

let validateFn: ((data: unknown) => boolean) | undefined;

function getValidate(schemaPath: string): (data: unknown) => boolean {
  if (!validateFn) {
    const Ajv2020 = require('ajv/dist/2020') as new (opts?: object) => {
      compile: (schema: object) => (data: unknown) => boolean;
    };
    const addFormats = require('ajv-formats') as (ajv: InstanceType<typeof Ajv2020>) => void;
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const compiled = ajv.compile(schema) as ((data: unknown) => boolean) & {
      errors?: Array<{ instancePath: string; message?: string }>;
    };
    validateFn = (data: unknown) => {
      const ok = compiled(data);
      if (!ok) {
        const msg =
          compiled.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ') ??
          'Invalid eval spec';
        throw new Error(`EVAL_SPEC_INVALID: ${msg}`);
      }
      return true;
    };
  }
  return validateFn;
}

export function validateEvalSpec(schemaPath: string, spec: unknown): void {
  getValidate(schemaPath)(spec);
}

export function defaultEvalSpec(): EvalSpec {
  return {
    schema_version: 1,
    screenshot: { strategy: 'auto' },
    gates: { require_change: true, no_detached_nodes: true },
    checks: [],
    visual: [
      { id: 'good_design_1', type: 'good_design' },
      { id: 'task_completeness_1', type: 'task_completeness' },
    ],
    category_importance: { ...DEFAULT_CATEGORY_IMPORTANCE },
  };
}

export function assertUniqueCheckIds(spec: EvalSpec): void {
  const ids = new Set<string>();
  for (const c of spec.checks ?? []) {
    const id = (c as { id?: string }).id;
    if (!id) throw new Error('EVAL_SPEC_INVALID: check missing id');
    if (ids.has(id)) throw new Error(`EVAL_SPEC_INVALID: duplicate check id ${id}`);
    ids.add(id);
  }
  const vids = new Set<string>();
  for (const v of spec.visual ?? []) {
    const id = (v as { id?: string }).id;
    if (!id) throw new Error('EVAL_SPEC_INVALID: visual check missing id');
    if (vids.has(id)) throw new Error(`EVAL_SPEC_INVALID: duplicate visual id ${id}`);
    vids.add(id);
  }
  const mids = new Set<string>();
  for (const m of spec.metadata_checks ?? []) {
    const id = (m as { id?: string }).id;
    if (!id) throw new Error('EVAL_SPEC_INVALID: metadata check missing id');
    if (mids.has(id)) throw new Error(`EVAL_SPEC_INVALID: duplicate metadata id ${id}`);
    mids.add(id);
  }
}
