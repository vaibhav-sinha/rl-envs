import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  compileSaleSection,
  compileSaleSectionWithOverlay,
  getOkerSaleSectionRootId,
  loadOkerEnvelope,
  snapshotKey,
} from '../helpers/okerSaleSection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenPath = join(__dirname, '../fixtures/oker-sale-section-golden.hash');

describe('oker sale section compile parity', () => {
  it('overlay compile matches legacy clone golden hash', () => {
    const envelope = loadOkerEnvelope();
    const rootId = getOkerSaleSectionRootId(envelope);
    const golden = readFileSync(goldenPath, 'utf8').trim();
    const overlay = compileSaleSectionWithOverlay(envelope, rootId);
    expect(snapshotKey(overlay)).toBe(golden);
  });

  it('legacy clone path matches golden hash', () => {
    const envelope = loadOkerEnvelope();
    const rootId = getOkerSaleSectionRootId(envelope);
    const golden = readFileSync(goldenPath, 'utf8').trim();
    const legacy = compileSaleSection(envelope, rootId);
    expect(snapshotKey(legacy)).toBe(golden);
  });

  it('overlay and legacy clone produce identical output', () => {
    const envelope = loadOkerEnvelope();
    const rootId = getOkerSaleSectionRootId(envelope);
    const overlay = compileSaleSectionWithOverlay(envelope, rootId);
    const legacy = compileSaleSection(envelope, rootId);
    expect(snapshotKey(overlay)).toBe(snapshotKey(legacy));
  });
});
