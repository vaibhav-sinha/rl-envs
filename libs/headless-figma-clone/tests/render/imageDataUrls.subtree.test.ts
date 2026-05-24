import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getLocalFontsFileBaseUrl } from '../../src/fonts/localFontRegistry.js';
import type { ComponentNode, FileEnvelope, FrameNode, InstanceNode, PageNode, RectangleNode, SceneNode } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import {
  buildImageDataUrlByHash,
  buildImageDataUrlForSubtree,
  buildImageFileUrlForSubtree,
  collectImageHashesFromSubtree,
} from '../../src/render/imageDataUrls.js';

const OTP_HFC = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
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

  it('buildImageFileUrlForSubtree returns file URLs for resolvable assets', () => {
    const env = JSON.parse(readFileSync(OTP_HFC, 'utf8')) as FileEnvelope;
    const pageId = firstPageId(env);
    const scoped = buildImageFileUrlForSubtree(env, OTP_HFC, pageId);
    expect(Object.keys(scoped).length).toBeGreaterThan(0);
    const uniqueUrls = new Set(Object.values(scoped));
    for (const url of uniqueUrls) {
      expect(url.startsWith('file:')).toBe(true);
      expect(existsSync(new URL(url))).toBe(true);
    }
  });

  it('buildImageFileUrlForSubtree keeps compiled HTML small vs data URL inlining', () => {
    const env = JSON.parse(readFileSync(OTP_HFC, 'utf8')) as FileEnvelope;
    const pageId = firstPageId(env);
    const fileUrls = buildImageFileUrlForSubtree(env, OTP_HFC, pageId);
    const dataUrls = buildImageDataUrlForSubtree(env, OTP_HFC, pageId);
    const compiledFile = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: pageId,
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        fontBaseUrl: getLocalFontsFileBaseUrl(),
        imageDataUrlByHash: fileUrls,
      },
    });
    const compiledData = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: pageId,
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        fontBaseUrl: getLocalFontsFileBaseUrl(),
        imageDataUrlByHash: dataUrls,
      },
    });
    expect(compiledFile.html.length).toBeLessThan(compiledData.html.length / 10);
    expect(compiledFile.html.length).toBeLessThan(10 * 1024 * 1024);
    expect(compiledFile.html).not.toContain('data:image/');
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

  it('collectImageHashesFromSubtree includes in-document component master paints', () => {
    const masterRect: RectangleNode = {
      id: 'R1',
      type: 'RECTANGLE',
      name: 'bg',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fills: [{ type: 'IMAGE', imageHash: 'only-on-master-hash', scaleMode: 'FILL', visible: true, opacity: 1, blendMode: 'NORMAL' }],
    };
    const masterRoot: FrameNode = {
      id: 'F1',
      type: 'FRAME',
      name: 'root',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      children: [masterRect],
    };
    const comp: ComponentNode = {
      id: 'C1',
      type: 'COMPONENT',
      name: 'Comp',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rootFrameId: 'F1',
    };
    const inst: InstanceNode = {
      id: 'I1',
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      mainComponentId: 'C1',
      children: [],
    };
    const page: PageNode = {
      id: 'P1',
      type: 'PAGE',
      name: 'Page',
      sourceFigmaId: '0:1',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      children: [comp, inst, masterRoot],
    };
    const env: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'test',
      fileName: 'test',
      nextInternalId: 10,
      document: {
        id: 'D1',
        type: 'DOCUMENT',
        name: 'doc',
        sourceFigmaId: '0:0',
        children: [page],
      },
      assets: {
        byId: {
          'only-on-master-hash': {
            id: 'only-on-master-hash',
            sha256: 'only-on-master-hash',
            mimeType: 'image/png',
            byteLength: 1,
          },
        },
      },
    };
    const hashes = collectImageHashesFromSubtree(env, 'I1');
    expect(hashes.has('only-on-master-hash')).toBe(true);
  });
});
