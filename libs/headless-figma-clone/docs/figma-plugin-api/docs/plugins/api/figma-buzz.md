<!-- source: https://developers.figma.com/docs/plugins/api/figma-buzz -->

- Plugins
- [Global Objects](global-objects.md)
- [figma](figma.md)
- buzz

The Buzz API provides methods for creating and managing media content in Figma Buzz. Please see the [Working in Buzz](../working-in-buzz.md) guide for how to use these functions.

info

This API is only available when your plugin is running in Figma Buzz (`figma.editorType === 'buzz'`).

### [createFrame](properties/figma-buzz-createframe.md)(rowIndex?: number, columnIndex?: number): [FrameNode](FrameNode.md)

Creates a new frame in Buzz, optionally positioned at specific canvas coordinates.

[View more →](properties/figma-buzz-createframe.md)

---

### [createInstance](properties/figma-buzz-createinstance.md)(component: [ComponentNode](ComponentNode.md), rowIndex: number, columnIndex?: number): [InstanceNode](InstanceNode.md)

Creates an instance of a component in Buzz, optionally positioned at specific canvas coordinates.

[View more →](properties/figma-buzz-createinstance.md)

---

### getBuzzAssetTypeForNode(node: [SceneNode](nodes.md#scene-node)): [BuzzAssetType](BuzzAssetType.md) | null

Gets the Buzz asset type for a given node.

[View more →](properties/figma-buzz-getbuzzassettypefornode.md)

---

### setBuzzAssetTypeForNode(node: [SceneNode](nodes.md#scene-node), assetType: [BuzzAssetType](BuzzAssetType.md)): void

Sets the Buzz asset type for a given node.

[View more →](properties/figma-buzz-setbuzzassettypefornode.md)

---

### getTextContent(node: [SceneNode](nodes.md#scene-node)): [BuzzTextField](BuzzTextField.md)[]

Extracts all text content fields from a node for dynamic content management.

[View more →](properties/figma-buzz-gettextcontent.md)

---

### getMediaContent(node: [SceneNode](nodes.md#scene-node)): [BuzzMediaField](BuzzMediaField.md)[]

Extracts all media content fields from a node for dynamic content management.

[View more →](properties/figma-buzz-getmediacontent.md)

---

### smartResize(node: [SceneNode](nodes.md#scene-node), width: number, height: number): void

Performs intelligent resizing of a node while maintaining layout integrity and aspect ratios.

[View more →](properties/figma-buzz-smartresize.md)

---

[Previous

addAnnotationCategoryAsync](properties/figma-annotations-addannotationcategoryasync.md)[Next

createFrame](properties/figma-buzz-createframe.md)
