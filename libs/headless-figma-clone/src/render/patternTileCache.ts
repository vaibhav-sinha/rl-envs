const tileCache = new Map<string, string>();

export function patternTileCacheKey(
  filePath: string | null,
  sourceNodeId: string,
  scalingKey: string
): string {
  return `${filePath ?? ''}\0${sourceNodeId}\0${scalingKey}`;
}

export function getCachedPatternTile(key: string): string | undefined {
  return tileCache.get(key);
}

export function setCachedPatternTile(key: string, dataUrl: string): void {
  tileCache.set(key, dataUrl);
}

export function clearPatternTileCache(): void {
  tileCache.clear();
}
