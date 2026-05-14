<!-- source: https://developers.figma.com/docs/plugins/api/properties/ShapeWithTextNode-rotation -->

- Plugins
- [Node Types](../nodes.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- rotation

On this page

The rotation of the node in degrees. Returns values from -180 to 180. Identical to `Math.atan2(-m10, m00)` in the [`relativeTransform`](nodes-relativetransform.md) matrix. When setting `rotation`, it will also set `m00`, `m01`, `m10`, `m11`.

Supported on:

- [ShapeWithTextNode](../ShapeWithTextNode.md)

## Signature[​](#signature "Direct link to Signature")

### [rotation](ShapeWithTextNode-rotation.md): number

## Remarks[​](#remarks "Direct link to Remarks")

The rotation is with respect to the top-left of the object. Therefore, it is independent from the position of the object. If you want to rotate with respect to the center (or any arbitrary point), you can do so via matrix transformations and [`relativeTransform`](nodes-relativetransform.md).

[Previous

ShapeWithTextNode](../ShapeWithTextNode.md)[Next

resize](ShapeWithTextNode-resize.md)

- [Signature](#signature)
- [Remarks](#remarks)
