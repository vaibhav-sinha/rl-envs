<!-- source: https://developers.figma.com/docs/plugins/adding-pattern-fills-and-strokes -->

- Plugins
- Development Guides
- Adding Pattern Fills and Strokes

On this page

Adding pattern fills and strokes to nodes is a bit different from adding other fill and stroke types, as described in [Editing Properties](editing-properties.md). This is because pattern fills and strokes reference other nodes in the document as their source, and those nodes need to be loaded before they can be used (see [Migrating to Dynamic Loading](migrating-to-dynamic-loading.md) for more information on how we load nodes dynamically).

Rather than setting the `fill` or `stroke` property of a node directly, you need to use [`setFillsAsync`](api/node-properties.md#setfillsasync) or [`setStrokesAsync`](api/node-properties.md#setstrokesasync), which return promises that resolve when the pattern fills or strokes have been applied. Setting `node.fills` or `node.strokes` directly with a [`PatternPaint`](api/Paint.md#patternpaint) will result in an error.

## Example[​](#example "Direct link to Example")

```
// Create a circle to use as the pattern source  
const circle = figma.createEllipse();  
circle.resize(10, 10);  
  
// Create a rectangle to apply the pattern fill to  
const rectangle = figma.createRectangle();  
rectangle.x = 20;  
rectangle.resize(100, 100);  
  
// Define the pattern paint referencing the circle  
const patternPaint = {  
  type: 'PATTERN',  
  sourceNodeId: circle.id, // Reference the circle as the pattern source  
  tileType: 'HORIZONTAL_HEXAGONAL',  
  scalingFactor: 1,  
  spacing: {x: 0.2, y: 0.2},  
  horizontalAlignment: 'CENTER',  
}  
  
// Apply the pattern fill to the rectangle  
await rectangle.setFillsAsync([patternPaint]);
```

[Previous

Working with Rich Text](working-with-rich-text.md)[Next

Working in FigJam](working-in-figjam.md)

- [Example](#example)
