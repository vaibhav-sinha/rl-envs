# Rendering and screenshot pipeline

[← Design index](./index.md) · [PRD rendering](../prd/rendering-and-screenshots.md)

## Components

```typescript
export interface CompiledDesign {
  html: string;
  css: string;
  warnings: string[];
  /** Bounding box of compiled subtree in root-local coordinates */
  bounds: Rect;
}

export interface DesignCompiler {
  compileSubtree(params: {
    envelope: FileEnvelope;
    rootNodeId: string;
    options: { viewportPaddingPx: number; includeCss: boolean; inlineCss: boolean };
  }): CompiledDesign;
}

export interface PlaywrightScreenshotService {
  capture(params: {
    compiled: CompiledDesign;
    clipRect: Rect;           // in CSS pixels relative to full HTML viewport origin
    format: 'png' | 'jpeg';
    scale: number;
    deviceScaleFactor?: number;
    background?: 'white' | 'transparent';
    timeoutMs: number;
  }): Promise<{ bytes: Buffer; width: number; height: number; mimeType: string }>;
}
```

## HTML document template (Phase 1 normative)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
/* injected css */
    </style>
  </head>
  <body style="margin:0;background:transparent;">
    <div id="hfc-root" style="position:relative;width:{W}px;height:{H}px;">
      <!-- nodes -->
    </div>
  </body>
</html>
```

- `{W}` / `{H}` are subtree width/height + `2 * viewportPaddingPx`.
- Root offset: wrap subtree in `div#hfc-root` positioned at `(padding, padding)`.

## FRAME mapping (Phase 1)

- Outer `div.hfc-node-{id}` with:

```css
position: absolute;
left: {x}px;
top: {y}px;
width: {width}px;
height: {height}px;
box-sizing: border-box;
```

- **Solid fill:** `background-color: rgba(r*255,g*255,b*255,a)` from first visible solid in `fills` (if none, transparent).
- **Stroke (Phase 1 simple):** if `strokes` has solid and `strokeWeight>0`, use `border: {strokeWeight}px solid rgba(...)` and `background-clip: padding-box` as needed; if both fill and border exist, prefer fill on background and border color from stroke.

**Known limitation documented in warnings:** inner fill + center stroke alignment differs from Figma; Phase 3 uses per-side model.

## Playwright capture (pseudocode)

```text
async function capture(compiled, clipRect, format, scale, ...):
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({
    deviceScaleFactor: deviceScaleFactor ?? 1,
    viewport: { width: compiled.viewportWidth, height: compiled.viewportHeight }
  })
  await page.setContent(compiled.html, { waitUntil: 'load', timeout: timeoutMs })
  if background === 'white':
    await page.addStyleTag({ content: 'body { background: #fff; }' })

  clip = scaleRect(clipRect, scale)
  buf = await page.screenshot({
    type: format === 'jpeg' ? 'jpeg' : 'png',
    clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height },
    omitBackground: background === 'transparent',
    animations: 'disabled',
  })
  await browser.close()
  return { bytes: buf, width: clip.width, height: clip.height, mimeType: ... }
```

## Warnings generation (examples)

| Condition | Warning string |
|-----------|----------------|
| Unsupported `blendMode` for CSS | `blend_mode_unsupported:<mode>` |
| Noise/texture skipped | `effect_skipped:NOISE` |
| PatternPaint approximation | `paint_approximation:PATTERN` |

## Golden tests

Store expected substrings in HTML/CSS snapshot tests; store PNG baselines per [Testing](./testing.md).

## Related documents

- [Layout and bounds](./layout-and-bounds.md)
- [Data model](./data-model.md)
