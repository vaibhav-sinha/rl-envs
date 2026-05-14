<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-loadbrushesasync -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- loadBrushesAsync

On this page

Makes all built-in brushes of the specified type available for use in the plugin. This function must be called before
setting the stroke of a node to a brush of the specified type.

There are two types of brushes: 'STRETCH' brushes, which stretch along the length of the stroke, and 'SCATTER' brushes, which scatter instances of the brush shape along the stroke.

## Signature[​](#signature "Direct link to Signature")

### [loadBrushesAsync](figma-loadbrushesasync.md)(brushType: 'STRETCH' | 'SCATTER'): Promise<void>

## Parameters[​](#parameters "Direct link to Parameters")

### brushType[​](#brushtype "Direct link to brushType")

The type of brush to load. Can be either 'STRETCH' or 'SCATTER'.

## Remarks[​](#remarks "Direct link to Remarks")

This function only needs to be called once per plugin run for each brush type that will be used. Once loaded, brushes of the specified type can be used freely.

[Previous

moveNodesToCoord](figma-movenodestocoord.md)[Next

fetch](global-fetch.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [brushType](#brushtype)
- [Remarks](#remarks)
