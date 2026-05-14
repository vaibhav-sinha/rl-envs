<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createrectangle -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createRectangle

On this page

Creates a new rectangle. The behavior is similar to using the `R` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createRectangle](figma-createrectangle.md)(): [RectangleNode](../RectangleNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a default fill, width and height both at 100, and is parented under `figma.currentPage`.

Create a rectangle and set basic styles

```
const rect = figma.createRectangle()  
  
// Move to (50, 50)  
rect.x = 50  
rect.y = 50  
  
// Set size to 200 x 100  
rect.resize(200, 100)  
  
// Set solid red fill  
rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
```

[Previous

mixed](figma-mixed.md)[Next

createLine](figma-createline.md)

- [Signature](#signature)
- [Remarks](#remarks)
