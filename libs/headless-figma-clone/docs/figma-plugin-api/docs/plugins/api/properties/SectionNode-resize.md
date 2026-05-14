<!-- source: https://developers.figma.com/docs/plugins/api/properties/SectionNode-resize -->

- Plugins
- [Node Types](../nodes.md)
- [SectionNode](../SectionNode.md)
- resize

On this page

Resizes the section node. Sections do not propagate constraints to their
children, so this behaves equivalently to [`resizeWithoutConstraints`](SectionNode-resizewithoutconstraints.md)
and is provided to match the resize ergonomics of other resizable nodes.

Supported on:

- [SectionNode](../SectionNode.md)

## Signature[​](#signature "Direct link to Signature")

### resize(width: number, height: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### width[​](#width "Direct link to width")

New width of the node. Must be >= 0.01

### height[​](#height "Direct link to height")

New height of the node. Must be >= 0.01

[Previous

resizeWithoutConstraints](SectionNode-resizewithoutconstraints.md)[Next

ShapeWithTextNode](../ShapeWithTextNode.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [width](#width)
  - [height](#height)
