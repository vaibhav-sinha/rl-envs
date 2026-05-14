<!-- source: https://developers.figma.com/docs/plugins/api/properties/VectorPath-data -->

- Plugins
- [Data Types](../data-types.md)
- [VectorPath](../VectorPath.md)
- data

On this page

A series of path commands that encodes how to draw the path.

## Signature[​](#signature "Direct link to Signature")

### [data](VectorPath-data.md): string [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

Figma supports a subset of the SVG path format. Path commands must be joined into a single string in order separated by a single space. Here are the path commands we support:

- `M x y`: The absolute "move to" command.
- `L x y`: The absolute "line to" command.
- `Q x0 y0 x y`: The absolute "quadratic spline to" command. *Note* that while Figma supports this as input, we will never generate this ourselves. All quadratic splines are converted to cubic splines internally.
- `C x0 y0 x1 y1 x y`: The absolute "cubic spline to" command.
- `Z`: The "close path" command.

[Previous

VectorPath](../VectorPath.md)[Next

windingRule](VectorPath-windingrule.md)

- [Signature](#signature)
- [Remarks](#remarks)
