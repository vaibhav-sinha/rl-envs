export async function runUseFigma(args: {
  code: string;
  description: string;
  skillNames?: string;
}): Promise<{ type: 'text'; text: string }[]> {
  void args.description;
  void args.skillNames;

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...params: string[]
  ) => (...args: unknown[]) => Promise<unknown>;

  try {
    const fn = new AsyncFunction('figma', `"use strict";\n${args.code}`);
    const result = await fn(figma);
    const payload: Record<string, unknown> = { ok: true };
    if (result !== undefined) {
      payload.result = result;
    }
    return [{ type: 'text', text: JSON.stringify(payload) }];
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    throw new Error(`VALIDATION_ERROR: ${message}${stack ? `\n${stack}` : ''}`);
  }
}
