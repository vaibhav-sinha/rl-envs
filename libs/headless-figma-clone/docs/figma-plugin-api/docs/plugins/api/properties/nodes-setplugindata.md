<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-setplugindata -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- setPluginData

On this page

Lets you store custom information on any node or style, **private** to your plugin. The total size of your entry (`pluginId`, `key`, `value`) cannot exceed 100 kB.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [DocumentNode](../DocumentNode.md)
- [EffectStyle](../EffectStyle.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GridStyle](../GridStyle.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PageNode](../PageNode.md)
- [PaintStyle](../PaintStyle.md)
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
- [TextStyle](../TextStyle.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [Variable](../Variable.md)
- [VariableCollection](../VariableCollection.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### [setPluginData](nodes-setplugindata.md)(key: string, value: string): void

## Parameters[​](#parameters "Direct link to Parameters")

### key[​](#key "Direct link to key")

The key under which to store the data. This is similar to writing to a plain object via `obj[key] = value`.

### value[​](#value "Direct link to value")

The data you want to store. If you want to store a value type other than a string, encode it as a JSON string first via `JSON.stringify` and `JSON.parse`. If you set the value to the empty string (""), the key/value pair is removed.

## Remarks[​](#remarks "Direct link to Remarks")

The data is specific to your plugin ID. Plugins with other IDs won't be able to read this data. You can retrieve it later by calling `getPluginData` with the same key. To find all data stored on a node or style by your plugin use `getPluginDataKeys`.

caution

⚠ The data is stored privately for **stability**, not **security**. It prevents other plugins from accessing with your data. It does not, however, prevent users from seeing the data given sufficient effort. For example, they could export the document as a .fig file and try to decode it.

caution

⚠ Data will become inaccessible if your plugin ID changes.

caution

⚠ Total entry size cannot exceed 100 kB.

[Previous

setGridChildPosition](nodes-setgridchildposition.md)[Next

setRelaunchData](nodes-setrelaunchdata.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [key](#key)
  - [value](#value)
- [Remarks](#remarks)
