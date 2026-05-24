import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DesignSpec } from './types.js';

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
          'Invalid design spec';
        throw new Error(`DESIGN_SPEC_INVALID: ${msg}`);
      }
      return true;
    };
  }
  return validateFn;
}

export function validateDesignSpec(schemaPath: string, spec: unknown): void {
  getValidate(schemaPath)(spec);
}

export function defaultDesignSpec(base: string): DesignSpec {
  return { schema_version: 1, base };
}

export type { DesignSpec };
