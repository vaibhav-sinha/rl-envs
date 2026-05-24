import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';
import type { FileEnvelope, FrameNode, InstanceNode, TextNode } from '../../src/model/types.js';

const OTP_HFC = join(
  __dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

function loadOtpEnvelope(): FileEnvelope {
  return JSON.parse(readFileSync(OTP_HFC, 'utf8')) as FileEnvelope;
}

function findNode(env: FileEnvelope, id: string) {
  const stack = [...env.document.children];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return n;
    if ('children' in n && Array.isArray((n as { children?: unknown[] }).children)) {
      for (const c of (n as { children: unknown[] }).children) stack.push(c as typeof n);
    }
  }
  return null;
}

function compileOtpRoot(env: FileEnvelope): { html: string; css: string; warnings: string[] } {
  const rootId = resolveHfcNodeIdBySourceFigmaId(env, '2176:169413');
  expect(rootId).toBeTruthy();
  return designCompiler.compileSubtree({
    envelope: env,
    rootNodeId: rootId!,
    options: {
      viewportPaddingPx: 0,
      includeCss: true,
      inlineCss: false,
      imageDataUrlByHash: buildImageDataUrlForSubtree(env, OTP_HFC, rootId!),
    },
  });
}

function styleBlob(compiled: { html: string; css: string }): string {
  return `${compiled.css}\n${compiled.html}`;
}

describe('OTP render parity', () => {
  it('subtitle with U+2028 uses pre-wrap (multi-line)', () => {
    const env = loadOtpEnvelope();
    const compiled = compileOtpRoot(env);
    const styles = styleBlob(compiled);
    expect(styles).toMatch(/white-space:pre-wrap/);
    expect(styles).not.toMatch(/\.hfc-node-I1601\{[^}]*white-space:pre;/);
  });

  it('background image fill includes opacity', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/background-image:url\(/);
    expect(styles).toMatch(/opacity:0\.3/);
  });

  it('keyboard background instance shell renders gray fill', () => {
    const env = loadOtpEnvelope();
    const compiled = compileOtpRoot(env);
    const styles = styleBlob(compiled);
    expect(styles).toMatch(/background-color:rgba\(206,210,217/);
    const { warnings } = compiled;
    expect(warnings.filter((w) => w.startsWith('missing_component:I0'))).toHaveLength(0);
  });

  it('primary button root spans full instance width', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/width:328px/);
  });

  it('secondary resend button clears component chrome when instance paints are empty', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/(Incorrect OTP|OTP expired)\. Please try again\./);
  });

  it('primary button label uses design font size not instance stretch scale', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/font-size:16px/);
    expect(styles).not.toMatch(/font-size:32\.07339449541284px/);
  });

  it('OTP digit input frame keeps instance width after detached merge', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/width:48px/);
  });

  it('OTP digit text uses center alignment after detached merge', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/text-align:center/);
  });

  it('header subtitle stays within instance bounds (no vertical stretch clip)', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/width:328px/);
    expect(styles).toMatch(/height:40px/);
    expect(styles).toMatch(/\+91 99304448/);
  });

  it('toast message omits paragraph spacing on single-line centered text', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    const toastSpan = styles.match(/Incorrect OTP\. Please try again\.[^<]*/)?.[0] ?? '';
    expect(toastSpan).not.toMatch(/margin-bottom:8px/);
  });

  it('toast instance wrapper allows shadow overflow', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/overflow:visible/);
    expect(styles).toMatch(/box-shadow:0px 4px 8px/);
  });

  it('instance paint shell for leaf keyboard key bg', () => {
    const env = loadOtpEnvelope();
    const styles = styleBlob(compileOtpRoot(env));
    expect(styles).toMatch(/box-shadow:/);
    expect(styles).toMatch(/background-color:rgba\(255,255,255,1\)/);
  });
});

describe('OTP render parity unit fixtures', () => {
  it('normalizeFigmaText via effectiveTextCharacters path wraps at line separator', () => {
    const t: TextNode = {
      id: 't1',
      type: 'TEXT',
      name: 'sub',
      x: 0,
      y: 0,
      width: 200,
      height: 40,
      characters: 'line one\u2028line two',
      textAutoResize: 'HEIGHT',
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
    };
    const env: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'k',
      fileName: 'f',
      nextInternalId: 2,
      document: {
        id: 'd',
        type: 'DOCUMENT',
        name: 'd',
        children: [
          {
            id: 'p',
            type: 'PAGE',
            name: 'p',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            children: [t],
          },
        ],
      },
    };
    const { html, css } = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 't1',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(styleBlob({ html, css })).toMatch(/white-space:pre-wrap/);
  });

  it('instance shell renders fills when mainComponentId missing', () => {
    const inst: InstanceNode = {
      id: 'shell1',
      type: 'INSTANCE',
      name: 'shell',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      mainComponentId: 'I0',
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.5, g: 0.5, b: 0.5 },
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL',
        },
      ],
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 2 },
          radius: 4,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ],
    };
    const env: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'k',
      fileName: 'f',
      nextInternalId: 2,
      document: {
        id: 'd',
        type: 'DOCUMENT',
        name: 'd',
        children: [
          {
            id: 'p',
            type: 'PAGE',
            name: 'p',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            children: [inst],
          },
        ],
      },
    };
    const compiled = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'shell1',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    const styles = styleBlob(compiled);
    expect(styles).toMatch(/\.hfc-node-shell1\{[^}]*background-color:rgba\(128,128,128,1\)/);
    expect(styles).toMatch(/box-shadow:/);
  });
});
