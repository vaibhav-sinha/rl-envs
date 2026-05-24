import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';

const OTP_HFC = join(
  __dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

function loadOtpEnvelope(): FileEnvelope {
  return JSON.parse(readFileSync(OTP_HFC, 'utf8')) as FileEnvelope;
}

function compileOtpRoot(env: FileEnvelope): string {
  const rootId = resolveHfcNodeIdBySourceFigmaId(env, '2176:169413');
  expect(rootId).toBeTruthy();
  const out = designCompiler.compileSubtree({
    envelope: env,
    rootNodeId: rootId!,
    options: {
      viewportPaddingPx: 0,
      includeCss: true,
      inlineCss: false,
      imageDataUrlByHash: buildImageDataUrlForSubtree(env, OTP_HFC, rootId!),
    },
  });
  return `${out.css}\n${out.html}`;
}

describe('OTP keyboard scaleFactor regression', () => {
  it('does not apply nested transform:scale on keyboard instances', () => {
    const styles = compileOtpRoot(loadOtpEnvelope());
    expect(styles).not.toMatch(/\.hfc-node-I1551\{[^}]*transform:[^;]*scale\(/);
    expect(styles).not.toMatch(/\.hfc-node-I1550 \.hfc-node-I1551\{[^}]*transform:[^;]*scale\(/);
  });

  it('keyboard background fills the instance box', () => {
    const styles = compileOtpRoot(loadOtpEnvelope());
    expect(styles).toMatch(
      /\.hfc-node-I1541 \.hfc-node-I1542\{[^}]*(?:left:0px;right:0px|width:360px)[^}]*(?:top:0px;bottom:0px|height:207)/
    );
    expect(styles).toMatch(/\.hfc-node-I1541 \.hfc-node-I1542\{[^}]*background-color:rgba\(206,210,217/);
  });
});
