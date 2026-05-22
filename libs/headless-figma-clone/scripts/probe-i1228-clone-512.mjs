import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json'
);

const AGENT_CODE = `
await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === 'Final design'));
const section = figma.getNodeById('I27');
const source = figma.getNodeById('I1228');
const clone = source.clone();
clone.name = 'Onboarding/OTP/MaxAttempts';
clone.x = 1313.25;
clone.y = 1533;
section.appendChild(clone);
const buttons = clone.findAll(n => n.type === 'INSTANCE' && n.name === 'Button');
const resendBtn = buttons.find(n => {
  const texts = n.findAll(t => t.type === 'TEXT' && t.name === 'Button');
  return texts.some(t => /resend/i.test(t.characters));
});
const maxMsg = 'You have reached your max attempts. Retry OTP generation after 15:00 minutes';
if (resendBtn) {
  resendBtn.setProperties({ State: 'Disabled', Text: maxMsg });
}
return { cloneId: clone.id, resendId: resendBtn?.id };
`.trim();

const { DocumentEngine } = await import('../dist/engine/DocumentEngine.js');
const { runUseFigmaScript } = await import('../dist/mcp/useFigmaScript.js');
const { JsonPersistence } = await import('../dist/persistence/JsonPersistence.js');
const { createConsoleLogger } = await import('../dist/util/logger.js');

function mb() {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

const tmp = mkdtempSync(join(tmpdir(), 'i1228-'));
const p = join(tmp, 'd.hfc.json');
writeFileSync(p, readFileSync(designPath));
const engine = new DocumentEngine({
  persistence: new JsonPersistence(),
  logger: createConsoleLogger('error'),
});
await engine.loadFromDisk({ absolutePath: p, save: false });
console.log('after load', mb(), 'MB');
const run = await runUseFigmaScript(AGENT_CODE, engine);
console.log('after script', run.kind, mb(), 'MB');
if (run.kind === 'ok' && run.committedWorking) {
  const tx = await engine.commitEnvelope(run.committedWorking, { touchedNodeIds: run.touchedNodeIds });
  console.log('after commit', tx.success, mb(), 'MB');
}
rmSync(tmp, { recursive: true, force: true });
