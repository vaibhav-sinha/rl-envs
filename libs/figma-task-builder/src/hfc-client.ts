export interface ImportHfcResponse {
  fileKey: string;
  fileName: string;
  slug: string;
  envelope: unknown;
  assets: Array<{ hash: string; mimeType: string; base64: string }>;
  figmaToHfc: Record<string, string>;
}

export class HfcClient {
  constructor(private readonly baseUrl: string) {}

  async importSnapshot(hfcFileName: string, snapshot: unknown): Promise<ImportHfcResponse> {
    const res = await fetch(`${this.baseUrl}/import/hfc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hfcFileName, snapshot }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `HFC import failed: ${res.status}`);
    }
    return (await res.json()) as ImportHfcResponse;
  }
}
