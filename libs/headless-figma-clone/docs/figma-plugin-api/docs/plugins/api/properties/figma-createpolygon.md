<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createpolygon -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createPolygon

On this page

Creates a new polygon (defaults to a triangle).

## Signature[​](#signature "Direct link to Signature")

### [createPolygon](figma-createpolygon.md)(): [PolygonNode](../PolygonNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has three edges (i.e. a triangle), a default fill, width and height both at 100, and is parented under `figma.currentPage`.

Create a red octagon

```
const polygon = figma.createPolygon()  
  
// Move to (50, 50)  
polygon.x = 50  
polygon.y = 50  
  
// Set size to 200 x 200  
polygon.resize(200, 200)  
  
// Make the polygon 8-sided  
polygon.pointCount = 8  
  
// Set solid red fill  
polygon.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
```

[Previous

createEllipse](figma-createellipse.md)[Next

createStar](figma-createstar.md)

- [Signature](#signature)
- [Remarks](#remarks)
