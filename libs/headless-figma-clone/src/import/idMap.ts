/** Maps Figma node ids (e.g. "123:456") to HFC internal ids (I1, I2, …). */
export class FigmaIdMap {
  private figmaToHfc = new Map<string, string>();
  private nextId: number;

  constructor(startAt = 1) {
    this.nextId = startAt;
  }

  allocate(figmaId: string): string {
    const existing = this.figmaToHfc.get(figmaId);
    if (existing) return existing;
    const hfcId = `I${this.nextId}`;
    this.nextId += 1;
    this.figmaToHfc.set(figmaId, hfcId);
    return hfcId;
  }

  get(figmaId: string): string | undefined {
    return this.figmaToHfc.get(figmaId);
  }

  /** Serializable Figma id → HFC id map (for eval-spec remapping after import). */
  toFigmaToHfcRecord(): Record<string, string> {
    return Object.fromEntries(this.figmaToHfc);
  }

  get nextInternalId(): number {
    return this.nextId;
  }
}
