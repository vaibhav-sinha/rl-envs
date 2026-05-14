<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- setSharedPluginData

On this page

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

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

### [setSharedPluginData](nodes-setsharedplugindata.md)(namespace: string, key: string, value: string): void

## Parameters[​](#parameters "Direct link to Parameters")

### namespace[​](#namespace "Direct link to namespace")

A unique string to identify your plugin and avoid key collisions with other plugins. The namespace must be at least 3 alphanumeric characters.

### key[​](#key "Direct link to key")

The key under which to store the data. This is similar to writing to a plain object via `obj[key] = value`.

### value[​](#value "Direct link to value")

The data you want to store. If you want to store a value type other than a string, encode it as a JSON string first via `JSON.stringify` and `JSON.parse`. If you set the value to the empty string (""), the key/value pair is removed.

## Remarks[​](#remarks "Direct link to Remarks")

This lets you store custom information on any node or style. You can retrieve it later by calling [`getSharedPluginData`](../node-properties.md#getsharedplugindata) with the same namespace and key. To find all data stored on a node or style in a particular namespace, use [`getSharedPluginDataKeys`](../node-properties.md#getsharedplugindatakeys).

Any data you write using this API will be readable by any plugin. The intent is to allow plugins to interoperate with each other. Use [`setPluginData`](nodes-setplugindata.md) instead if you don't want other plugins to be able to read your data.

You must also provide a `namespace` argument to avoid key collisions with other plugins. This argument is mandatory to prevent multiple plugins from using generic key names like `data` and overwriting one another. We recommend passing a value that identifies your plugin. This namespace can be given to authors of other plugins so that they can read data from your plugin.

caution

⚠ Total entry size cannot exceed 100 kB.

[Previous

setRelaunchData](nodes-setrelaunchdata.md)[Next

strokeAlign](nodes-strokealign.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [namespace](#namespace)
  - [key](#key)
  - [value](#value)
- [Remarks](#remarks)
