<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createshapewithtext -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createShapeWithText

On this page

info

This API is only available in FigJam

Creates a new shape with text.

## Signature[​](#signature "Direct link to Signature")

### [createShapeWithText](figma-createshapewithtext.md)(): [ShapeWithTextNode](../ShapeWithTextNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a width and height of 208, and is parented under `figma.currentPage`.

Create a rounded rectangle shape with text

```
(async () => {  
  const shape = figma.createShapeWithText()  
  shape.shapeType = 'ROUNDED_RECTANGLE'  
  
  // Load the font before setting characters  
  await figma.loadFontAsync(shape.text.fontName)  
  shape.text.characters = 'Hello world!'  
})()
```

[Previous

createConnector](figma-createconnector.md)[Next

createTable](figma-createtable.md)

- [Signature](#signature)
- [Remarks](#remarks)
