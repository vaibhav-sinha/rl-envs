<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createsticky -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createSticky

On this page

info

This API is only available in FigJam

Creates a new sticky. The behavior is similar to using the `S` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createSticky](figma-createsticky.md)(): [StickyNode](../StickyNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has constant width and height both at 240, and is parented under `figma.currentPage`.

Create a sticky with text

```
(async () => {  
  const sticky = figma.createSticky()  
  
  // Load the font before setting characters  
  await figma.loadFontAsync(sticky.text.fontName)  
  sticky.text.characters = 'Hello world!'  
})()
```

[Previous

createSlideRow](figma-createsliderow.md)[Next

createConnector](figma-createconnector.md)

- [Signature](#signature)
- [Remarks](#remarks)
