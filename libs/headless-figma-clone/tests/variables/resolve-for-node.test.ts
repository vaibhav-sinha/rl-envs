import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { resolveVariableToRgb } from '../../src/variables/resolution.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDemo(): FileEnvelope {
  const p = join(__dirname, '../fixtures/phase5-demo.hfc.json');
  return JSON.parse(readFileSync(p, 'utf8')) as FileEnvelope;
}

describe('resolveVariableToRgb for active mode', () => {
  it('uses defaultModeId when no override', () => {
    const env = loadDemo();
    expect(resolveVariableToRgb(env, 'VV1')).toEqual({ r: 0.12, g: 0.35, b: 0.92 });
  });

  it('respects activeModeByCollectionId', () => {
    const env = loadDemo();
    env.variableCollections![0].modes.push({ id: 'VM2', name: 'Alt' });
    env.variableCollections![0].variables[0].valuesByMode['VM2'] = {
      type: 'COLOR',
      color: { r: 0.95, g: 0.1, b: 0.1 },
    };
    env.activeModeByCollectionId = { VCOL1: 'VM2' };
    expect(resolveVariableToRgb(env, 'VV1')).toEqual({ r: 0.95, g: 0.1, b: 0.1 });
  });
});
