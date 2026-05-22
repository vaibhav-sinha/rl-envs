import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope, PageNode, SceneNode } from '../../src/model/types.js';
import {
  buildImageDataUrlByHash,
  buildImageDataUrlForSubtree,
  collectImageHashesFromSubtree,
} from '../../src/render/imageDataUrls.js';

const OTP_HFC = join(
  import.meta.dirname,
  '../../../../envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json'
);

function firstPageId(env: FileEnvelope): string {
  const page = env.document.children.find((c): c is PageNode => c.type === 'PAGE');
  expect(page).toBeDefined();
  return page!.id;
}

describe('imageDataUrls subtree scope', () => {
  it('buildImageDataUrlForSubtree encodes fewer assets than the full registry', () => {
    const env = JSON.parse(readFileSync(OTP_HFC, 'utf8')) as FileEnvelope;
    const pageId = firstPageId(env);
    const scoped = buildImageDataUrlForSubtree(env, OTP_HFC, pageId);
    const full = buildImageDataUrlByHash(env, OTP_HFC);
    expect(Object.keys(full).length).toBeGreaterThan(100);
    expect(Object.keys(scoped).length).toBeLessThan(Object.keys(full).length);
    for (const url of Object.values(scoped)) {
      expect(url.startsWith('data:')).toBe(true);
    }
  });

  it('collectImageHashesFromSubtree only includes hashes from the requested root', () => {
    const env = JSON.parse(readFileSync(OTP_HFC, 'utf8')) as FileEnvelope;
    const pageId = firstPageId(env);
    const pageHashes = collectImageHashesFromSubtree(env, pageId);
    const section = env.document.children
      .flatMap((c) => (c.type === 'PAGE' ? c.children : []))
      .find((n): n is SceneNode => n.id === 'I27');
    expect(section).toBeDefined();
    const sectionHashes = collectImageHashesFromSubtree(env, 'I27');
    expect(sectionHashes.size).toBeLessThanOrEqual(pageHashes.size);
  });
});
