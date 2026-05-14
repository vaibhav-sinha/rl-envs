<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createconnector -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createConnector

On this page

info

This API is only available in FigJam

Creates a new connector. The behavior is similar to using the `Shift-C` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createConnector](figma-createconnector.md)(): [ConnectorNode](../ConnectorNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a width of 200, and is parented under `figma.currentPage`.

Add a connector between two stickies

```
// Create two stickies  
const stickyLeft = figma.createSticky()  
stickyLeft.x = -200  
  
const stickyRight = figma.createSticky()  
stickyRight.x = 200  
  
// Connect the two stickies  
const connector = figma.createConnector()  
connector.connectorStart = {  
  endpointNodeId: stickyLeft.id,  
  magnet: 'AUTO'  
}  
  
connector.connectorEnd = {  
  endpointNodeId: stickyRight.id,  
  magnet: 'AUTO'  
}
```

[Previous

createSticky](figma-createsticky.md)[Next

createShapeWithText](figma-createshapewithtext.md)

- [Signature](#signature)
- [Remarks](#remarks)
