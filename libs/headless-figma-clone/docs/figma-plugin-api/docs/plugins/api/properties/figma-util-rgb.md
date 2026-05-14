<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-util-rgb -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [util](../figma-util.md)
- rgb

On this page

Creates an `RGB` color object from a variety of common color encodings.

**Note**: since `RGB` colors are primarily used for creating `SolidPaint` objects, you might want to use [`solidPaint`](figma-util-solidpaint.md) instead.

Accepted color formats include CSS color strings with hex, `rgb()`, `hsl()`, or `lab()` encodings, as well as `RGB` and `RGBA` objects. Alpha values in the input will be ignored. If a string encoding cannot be parsed, an error will be thrown.

Examples:

```
const color1 = figma.util.rgb('#FF00FF')  
const color2 = figma.util.rgb('hsl(25% 50% 75%)')
```

You can alias this function for more concise code:

```
const rgb = figma.util.rgb  
const color = rgb('#FF00FF')
```

## Signature[​](#signature "Direct link to Signature")

### rgb(color: string | [RGB](../RGB.md) | [RGBA](../RGB.md#rgba)): [RGB](../RGB.md)

## Parameters[​](#parameters "Direct link to Parameters")

### color[​](#color "Direct link to color")

A CSS color string, `RGB` object, or `RGBA` object. The input color's alpha value, if any, will be ignored.

[Previous

util](../figma-util.md)[Next

rgba](figma-util-rgba.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [color](#color)
