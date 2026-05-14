<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createvector -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createVector

On this page

Creates a new, empty vector network with no vertices.

## Signature[​](#signature "Direct link to Signature")

### [createVector](figma-createvector.md)(): [VectorNode](../VectorNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, parented under `figma.currentPage`. Without setting additional properties, the vector has a bounding box but doesn't have any vertices. There are two ways to assign vertices to a vector node - [`vectorPaths`](../VectorNode.md#vectorpaths) and [`setVectorNetworkAsync`](../VectorNode.md#setvectornetworkasync). Please refer to the documentation of those properties for more details.

[Previous

createStar](figma-createstar.md)[Next

createText](figma-createtext.md)

- [Signature](#signature)
- [Remarks](#remarks)
