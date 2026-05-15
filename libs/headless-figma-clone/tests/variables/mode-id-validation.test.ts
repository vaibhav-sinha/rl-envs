import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { assertRequiredModeId } from '../../src/variables/validation.js';
import { ValidationErr } from '../../src/util/errors.js';

describe('variable modeId validation (Figma parity)', () => {
  it('assertRequiredModeId rejects missing modeId with Figma message', () => {
    expect(() => assertRequiredModeId(undefined)).toThrow(ValidationErr);
    try {
      assertRequiredModeId(undefined);
    } catch (e) {
      expect((e as ValidationErr).message).toBe(
        'in setValueForMode: Property "modeId" failed validation: Required value missing'
      );
    }
  });

  it('collection modes expose modeId only, not id', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runUseFigmaScript(
      `
const col = figma.variables.createVariableCollection('Brand');
const mode = col.modes[0];
return { hasModeId: typeof mode.modeId === 'string', hasId: 'id' in mode };
`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind === 'ok') {
      expect(run.result).toEqual({ hasModeId: true, hasId: false });
    }
  });

  it('setValueForMode rejects undefined modeId like Figma', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runUseFigmaScript(
      `
const col = figma.variables.createVariableCollection('Brand');
const brand = figma.variables.createVariable('primary', col, 'COLOR');
brand.setValueForMode(col.modes[0].id, { r: 1, g: 0, b: 0 });
return {};
`.trim(),
      engine
    );
    expect(run.kind).toBe('error');
    if (run.kind === 'error') {
      expect(run.message).toContain('in setValueForMode');
      expect(run.message).toContain('modeId');
      expect(run.message).toContain('Required value missing');
    }
  });
});
