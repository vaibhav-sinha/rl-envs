<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- exportAsync

On this page

Exports the node as an encoded image.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](../PageNode.md), you must first call [`loadAsync`](../PageNode.md#loadasync) to access this function.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PageNode](../PageNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SliceNode](../SliceNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### exportAsync(settings?: [ExportSettings](../ExportSettings.md)): Promise<Uint8Array>

### exportAsync(settings: [ExportSettingsSVGString](../ExportSettings.md#export-settings-svgstring)): Promise<string>

### exportAsync(settings: [ExportSettingsREST](../ExportSettings.md#export-settings-rest)): Promise<Object>

## Parameters[​](#parameters "Direct link to Parameters")

### settings[​](#settings "Direct link to settings")

When this parameter is absent, this function defaults to exporting as a PNG at 1x resolution.

Note that the result is a Uint8Array, representing the bytes of the image file (encoded in the specified format).

Create a hexagon, export as PNG, and place on canvas

```
(async () => {  
  const polygon = figma.createPolygon()  
  polygon.pointCount = 6  
  polygon.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]  
  
  // Export a 2x resolution PNG of the node  
  const bytes = await polygon.exportAsync({  
    format: 'PNG',  
    constraint: { type: 'SCALE', value: 2 },  
  })  
  
  // Add the image onto the canvas as an image fill in a frame  
  const image = figma.createImage(bytes)  
  const frame = figma.createFrame()  
  frame.x = 200  
  frame.resize(200, 230)  
  frame.fills = [{  
    imageHash: image.hash,  
    scaleMode: "FILL",  
    scalingFactor: 1,  
    type: "IMAGE",  
  }]  
})()
```

Export a VectorNode as an SVG string

```
 (async () => {  
   // Create a triangle using the VectorPath API  
   const vector = figma.createVector()  
   vector.vectorPaths = [{  
     windingRule: "EVENODD",  
     data: "M 0 100 L 100 100 L 50 0 Z",  
   }]  
  
   // Export the vector to SVG  
   const svg = await vector.exportAsync({ format: 'SVG_STRING' })  
   console.log(svg);  
 })()
```

Export a node as a JSON object

```
(async () => {  
  const json = await figma.currentPage.selection[0].exportAsync({format: 'JSON_REST_V1'})  
  // Return a JSON object in the same format as the Figma REST API response  
  console.log(json.document)  
})()
```

[Previous

editDevResourceAsync](nodes-editdevresourceasync.md)[Next

fillStyleId](nodes-fillstyleid.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [settings](#settings)
