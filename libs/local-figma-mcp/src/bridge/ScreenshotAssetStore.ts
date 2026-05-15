import { randomUUID } from 'node:crypto';

export interface ScreenshotAsset {
  bytes: Buffer;
  mimeType: string;
  expiresAt: number;
}

export class ScreenshotAssetStore {
  private readonly assets = new Map<string, ScreenshotAsset>();

  constructor(private readonly ttlMs: number) {}

  put(bytes: Buffer, mimeType: string): string {
    this.prune();
    const token = randomUUID();
    this.assets.set(token, {
      bytes,
      mimeType,
      expiresAt: Date.now() + this.ttlMs,
    });
    return token;
  }

  get(token: string): ScreenshotAsset | undefined {
    this.prune();
    return this.assets.get(token);
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, v] of this.assets) {
      if (v.expiresAt <= now) this.assets.delete(k);
    }
  }
}
