import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { EvalSpec } from './types.js';

const checkBase = z.object({
  id: z.string().min(1),
  required: z.boolean().optional(),
});

const checkSchema = z.discriminatedUnion('type', [
  checkBase.extend({ type: z.literal('node_exists'), node_id: z.string() }),
  checkBase.extend({ type: z.literal('min_added_under'), parent_id: z.string(), min: z.number().positive() }),
  checkBase.extend({ type: z.literal('min_modified_under'), parent_id: z.string(), min: z.number().positive() }),
  checkBase.extend({
    type: z.literal('component_instances_under'),
    scope_id: z.string(),
    component_id: z.string(),
    min_instances: z.number().int().positive(),
  }),
  checkBase.extend({ type: z.literal('metadata_only_under'), parent_id: z.string() }),
  checkBase.extend({
    type: z.literal('property_on_node'),
    node_id: z.string(),
    property: z.string(),
    equals: z.union([z.string(), z.number(), z.boolean()]),
  }),
]);

const visualSchema = z.object({
  id: z.string().min(1),
  region_id: z.string(),
  mode: z.enum(['relative_to_siblings', 'region_stable', 'match_asset']),
  instruction: z.string(),
  focus: z.enum(['largest_added', 'added', 'all']).optional(),
  reference_asset: z.string().optional(),
});

const evalSpecSchema = z.object({
  schema_version: z.literal(1),
  gates: z
    .object({
      require_change: z.boolean().optional(),
      preserve_ids: z.array(z.string()).optional(),
      forbid_delete_ids: z.array(z.string()).optional(),
      max_change_outside_ids: z.array(z.string()).optional(),
    })
    .optional(),
  checks: z.array(checkSchema).optional(),
  visual: z.array(visualSchema).optional(),
  weights: z
    .object({
      gates: z.number().optional(),
      checks: z.number().optional(),
      design_system: z.number().optional(),
      visual: z.number().optional(),
      heuristics: z.number().optional(),
    })
    .optional(),
});

export function validateEvalSpec(raw: unknown): EvalSpec {
  return evalSpecSchema.parse(raw) as EvalSpec;
}

export function loadAndValidateEvalSpec(path: string): EvalSpec {
  const text = readFileSync(path, 'utf8');
  return validateEvalSpec(JSON.parse(text));
}

export function getEvalSpecJsonSchema(): object {
  const here = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(here, '..', '..', 'schemas', 'eval-spec.schema.json');
  try {
    return JSON.parse(readFileSync(schemaPath, 'utf8')) as object;
  } catch {
    return evalSpecSchema;
  }
}
