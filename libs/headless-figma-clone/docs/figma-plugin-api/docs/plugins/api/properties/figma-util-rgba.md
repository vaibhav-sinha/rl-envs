<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-util-rgba -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [util](../figma-util.md)
- rgba

On this page

Creates an `RGBA` color object from a variety of common color encodings.

Accepted color formats include CSS color strings with hex, `rgb()`, `hsl()`, or `lab()` encodings, as well as `RGB` and `RGBA` objects. Alpha defaults to 1 (opaque) if not provided in the input. If a string encoding cannot be parsed, an error will be thrown.

Examples:

```
const layoutGrid = {  
  pattern: 'GRID',  
  sectionSize: 1,  
  color: figma.util.rgba('rgb(25% 25% 25% / 0.5)')  
}
```

You can alias this function for more concise code:

```
const rgba = figma.util.rgba  
const color = rgba('rgb(25% 25% 25% / 0.5)')
```

## Signature[​](#signature "Direct link to Signature")

### rgba(color: string | [RGB](../RGB.md) | [RGBA](../RGB.md#rgba)): [RGBA](../RGB.md#rgba)

## Parameters[​](#parameters "Direct link to Parameters")

### color[​](#color "Direct link to color")

A CSS color string, `RGB` object, or `RGBA` object.

[Previous

rgb](figma-util-rgb.md)[Next

solidPaint](figma-util-solidpaint.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [color](#color)
