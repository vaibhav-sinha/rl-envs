<!-- source: https://developers.figma.com/docs/plugins/api/node-properties -->

- Plugins
- Shared Node Properties

Nodes support a range of properties. Some properties are universal, some are shared between node types, and some are unique to specific node types.

On this page, you can explore properties which are available on multiple nodes. Properties appear in alphabetical order, and you can see which nodes each property is supported on.

### absoluteBoundingBox: [Rect](Rect.md) | null [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The bounds of the node that does not include rendered properties like drop shadows or strokes. The `x` and `y` inside this property represent the absolute position of the node on the page.

---

### absoluteRenderBounds: [Rect](Rect.md) | null [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The actual bounds of a node accounting for drop shadows, thick strokes, and anything else that may fall outside the node's regular bounding box defined in `x`, `y`, `width`, and `height`. The `x` and `y` inside this property represent the absolute position of the node on the page. This value will be `null` if the node is invisible.

---

### absoluteTransform: [Transform](Transform.md) [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The position of a node relative to its **containing page** as a [`Transform`](Transform.md) matrix.

---

### addComponentProperty(propertyName: string, type: [ComponentPropertyType](ComponentPropertyType.md), defaultValue: string | boolean | [VariableAlias](VariableAlias.md), options?: [ComponentPropertyOptions](ComponentPropertyOptions.md)): string

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)

Adds a new component property to this node and returns the property name with its unique identifier suffixed. This function supports properties with type `'BOOLEAN'`, `'TEXT'`, `'INSTANCE_SWAP'`, `'VARIANT'`, or `'SLOT'`.

---

### addDevResourceAsync(url: string, name?: string): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Adds a dev resource to a node. This will fail if the node already has a dev resource with the same url.

[View more →](properties/nodes-adddevresourceasync.md)

---

### addMeasurement(start: { node: [SceneNode](nodes.md#scene-node); side: [MeasurementSide](MeasurementSide.md) }, end: { node: [SceneNode](nodes.md#scene-node); side: [MeasurementSide](MeasurementSide.md) }, options?: { offset: [MeasurementOffset](MeasurementOffset.md); freeText: string }): [Measurement](Measurement.md)

Supported on:

- [PageNode](PageNode.md)

Adds a measurement between two nodes in the current page.

Measurements are always between a start and end node. The side indicates which edge of the node to draw the measurement from.

Measurements can only go on the same axis, i.e. from side `"LEFT"` -> `"LEFT"`, `"LEFT"` -> `"RIGHT"`, `"TOP"` -> `"BOTTOM"` etc. But not `"LEFT"` -> `"TOP"`.

See the [Measurement type](Measurement.md) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}
```

---

### annotations: ReadonlyArray<[Annotation](Annotation.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)

Annotations on the node.

Learn more about annotations in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935) or see the [Annotation type](Annotation.md) for usage examples.

---

### [appendChild](properties/nodes-appendchild.md)(child: [SceneNode](nodes.md#scene-node)): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Adds a new child to the end of the [`children`](properties/nodes-children.md) array. That is, visually on top of all other children.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-appendchild.md)

---

### [appendChildAt](properties/nodes-appendchildat.md)(node: [SceneNode](nodes.md#scene-node), rowIndex: number, columnIndex: number): void

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`.
Appends a node to the grid at the specified row and column index.

[View more →](properties/nodes-appendchildat.md)

---

### attachedConnectors: [ConnectorNode](ConnectorNode.md)[] [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

An array of `ConnectorNode`s that are attached to a node.

---

### backgroundStyleId: string

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

**DEPRECATED:** Use `fillStyleId` instead. This property is read-only if the manifest contains `"documentAccess": "dynamic-page"`.

---

### backgrounds: ReadonlyArray<[Paint](Paint.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

**DEPRECATED:** Use `fills` instead.

---

### blendMode: [BlendMode](BlendMode.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Blend mode of this node, as shown in the Layer panel. In addition to the blend modes that paints & effects support, the layer blend mode can also have the value PASS\_THROUGH.

---

### bottomLeftRadius: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

---

### bottomRightRadius: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

---

### boundVariables?: { readonly [field in [VariableBindableNodeField](VariableBindableNodeField.md)]?: [VariableAlias](VariableAlias.md)} & { readonly [field in [VariableBindableTextField](VariableBindableTextField.md)]?: [VariableAlias](VariableAlias.md)[]} & { fills: [VariableAlias](VariableAlias.md)[]; strokes: [VariableAlias](VariableAlias.md)[]; effects: [VariableAlias](VariableAlias.md)[]; layoutGrids: [VariableAlias](VariableAlias.md)[]; componentProperties: { [propertyName: string]: [VariableAlias](VariableAlias.md) }; textRangeFills: [VariableAlias](VariableAlias.md)[] } [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The variables bound to a particular field on this node. Please see the [Working with Variables](../working-with-variables.md) guide for how to get and set variable bindings.

---

### [characters](properties/TextNode-characters.md): string

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

The raw characters in the text node. Setting this property requires the font the be loaded.

[View more →](properties/TextNode-characters.md)

---

### [children](properties/nodes-children.md): ReadonlyArray<[SceneNode](nodes.md#scene-node)> [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

The list of children, sorted back-to-front. That is, the first child in the array is the bottommost layer on the screen, and the last child in the array is the topmost layer.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this property.

[View more →](properties/nodes-children.md)

---

### clearExplicitVariableModeForCollection(collection: [VariableCollection](VariableCollection.md)): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Clears an explicit mode for the given collection on this node

[View more →](properties/ExplicitVariableModesMixin-clearexplicitvariablemodeforcollection.md)

---

### clipsContent: boolean

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Whether the frame clips its contents. That is, whether layers inside the frame are visible outside the bounds of the frame.

---

### [complexStrokeProperties](properties/nodes-complexstrokeproperties.md): [ComplexStrokeProperties](ComplexStrokeProperties.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)

The complex stroke properties for nodes using brush or dynamic strokes.

[View more →](properties/nodes-complexstrokeproperties.md)

---

### [componentPropertyDefinitions](properties/ComponentPropertiesMixin-componentpropertydefinitions.md): [ComponentPropertyDefinitions](ComponentPropertyDefinitions.md) [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)

All component properties and their default values that exist on this component set. `'VARIANT'` properties will also have a list of all variant options. `'BOOLEAN'`, `'TEXT'`, and `'INSTANCE_SWAP'` properties will have their names suffixed by a unique identifier starting with `'#'`, which is helpful for quickly distinguishing multiple component properties that have the same name in the Figma UI. The entire property name should be used for all Component property-related API methods and properties.

[View more →](properties/ComponentPropertiesMixin-componentpropertydefinitions.md)

---

### componentPropertyReferences: { [nodeProperty in 'visible' | 'characters' | 'mainComponent']?: string} | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

All component properties that are attached on this node. A node can only have `componentPropertyReferences` if it is a component sublayer or an instance sublayer. It will be `null` otherwise. The value in the key-value pair refers to the component property name as returned by `componentPropertyDefinitions` on the containing component, component set or main component (for instances).

When setting, may throw the following errors: cannotApplySlotPropertyToNonFrameNode, cannotApplySlotPropertyToFrameWithGrid, or cannotApplySlotPropertyToFrame.

---

### constrainProportions: boolean

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

**DEPRECATED:** Use `targetAspectRatio`, `lockAspectRatio`, and `unlockAspectRatio` instead.

When toggled, causes the layer to keep its proportions when the user resizes it via the properties panel.

---

### [constraints](properties/nodes-constraints.md): [Constraints](Constraints.md)

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)

Constraints of this node relative to its containing [`FrameNode`](FrameNode.md), if any.

[View more →](properties/nodes-constraints.md)

---

### [cornerRadius](properties/nodes-cornerradius.md): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StarNode](StarNode.md)
- [VectorNode](VectorNode.md)

The number of pixels to round the corners of the object by.

[View more →](properties/nodes-cornerradius.md)

---

### [cornerSmoothing](properties/nodes-cornersmoothing.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StarNode](StarNode.md)
- [VectorNode](VectorNode.md)

A value that lets you control how "smooth" the corners are. Ranges from 0 to 1.

[View more →](properties/nodes-cornersmoothing.md)

---

### [counterAxisAlignContent](properties/nodes-counteraxisaligncontent.md): 'AUTO' | 'SPACE\_BETWEEN'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames with [`layoutWrap`](properties/nodes-layoutwrap.md) set to `"WRAP"`. Determines how the wrapped tracks are spaced out inside of the auto-layout frame.

[View more →](properties/nodes-counteraxisaligncontent.md)

---

### [counterAxisAlignItems](properties/nodes-counteraxisalignitems.md): 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the counter axis direction.

[View more →](properties/nodes-counteraxisalignitems.md)

---

### [counterAxisSizingMode](properties/nodes-counteraxissizingmode.md): 'FIXED' | 'AUTO'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines whether the counter axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](properties/nodes-counteraxissizingmode.md)

---

### [counterAxisSpacing](properties/nodes-counteraxisspacing.md): number | null

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames with [`layoutWrap`](properties/nodes-layoutwrap.md) set to `"WRAP"`. Determines the distance between wrapped tracks. The value must be positive.

[View more →](properties/nodes-counteraxisspacing.md)

---

### dashPattern: ReadonlyArray<number>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

A list of numbers specifying alternating dash and gap lengths, in pixels.

---

### [deleteCharacters](properties/TextNode-deletecharacters.md)(start: number, end: number): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Remove characters in the text from `start` (inclusive) to `end` (exclusive).

[View more →](properties/TextNode-deletecharacters.md)

---

### deleteComponentProperty(propertyName: string): void

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)

Deletes an existing component property on this node. This function only supports properties with type `'BOOLEAN'`, `'TEXT'`, `'INSTANCE_SWAP'` or `'SLOT'`.

---

### deleteDevResourceAsync(url: string): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Deletes a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](properties/nodes-deletedevresourceasync.md)

---

### deleteMeasurement(id: string): void

Supported on:

- [PageNode](PageNode.md)

Delete a measurement.

See the [Measurement type](Measurement.md) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}
```

---

### [description](properties/nodes-description.md): string

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EffectStyle](EffectStyle.md)
- [GridStyle](GridStyle.md)
- [PaintStyle](PaintStyle.md)
- [TextStyle](TextStyle.md)

The plain-text annotation entered by the user for this style/component.

[View more →](properties/nodes-description.md)

---

### [descriptionMarkdown](properties/nodes-descriptionmarkdown.md): string

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EffectStyle](EffectStyle.md)
- [GridStyle](GridStyle.md)
- [PaintStyle](PaintStyle.md)
- [TextStyle](TextStyle.md)

The rich-text annotation entered by the user for this style/component.

[View more →](properties/nodes-descriptionmarkdown.md)

---

### detachedInfo: [DetachedInfo](DetachedInfo.md) | null [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Includes the id (for local components) or key (for library components) of the component the given node was detached from, if any. If the node isn't a detached instance, it will be null. If the node is a component or instance, it will be null.

---

### devStatus: [DevStatus](DevStatus.md)

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SectionNode](SectionNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Whether the node is marked [ready for development](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#01H8CR3K6V9S02RK503QCX0367) or [completed](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#01H8CR3K6V9S02RK503QCX0367).

There are some restrictions on how `devStatus` can be set:

- Can only be set on a node directly under a page or section
- Cannot be set on a node that is inside another node that already has a `devStatus`

---

### [documentationLinks](properties/nodes-documentationlinks.md): ReadonlyArray<[DocumentationLink](DocumentationLink.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EffectStyle](EffectStyle.md)
- [GridStyle](GridStyle.md)
- [PaintStyle](PaintStyle.md)
- [TextStyle](TextStyle.md)

The documentation links for this style/component.

[View more →](properties/nodes-documentationlinks.md)

---

### editComponentProperty(propertyName: string, newValue: { name: string; defaultValue: string | boolean | [VariableAlias](VariableAlias.md); preferredValues: [InstanceSwapPreferredValue](InstanceSwapPreferredValue.md)[]; description: string }): string

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)

Modifies the name, default value, or preferred values of an existing component property on this node and returns the property name with its unique identifier suffixed.

This function supports properties with type `'BOOLEAN'`, `'TEXT'`, `'INSTANCE_SWAP'`, `'VARIANT'`, or `'SLOT'` with the following restrictions:

- `name` is supported for all properties
- `defaultValue` is supported for `'BOOLEAN'`, `'TEXT'`, and `'INSTANCE_SWAP'` properties, but not for `'VARIANT'` or `'SLOT'` properties
- `preferredValues` is only supported for `'INSTANCE_SWAP'` and `'SLOT'` properties
- `description` is only supported for `'SLOT'` properties

---

### editDevResourceAsync(currentUrl: string, newValue: { name: string; url: string }): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Edits a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](properties/nodes-editdevresourceasync.md)

---

### editMeasurement(id: string, newValue: { offset: [MeasurementOffset](MeasurementOffset.md); freeText: string }): [Measurement](Measurement.md)

Supported on:

- [PageNode](PageNode.md)

Edit a measurement’s offset.

See the [Measurement type](Measurement.md) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}
```

---

### effectStyleId: string

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The id of the [`EffectStyle`](EffectStyle.md) object that the properties of this node are linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setEffectStyleIdAsync` to update the style.

---

### effects: ReadonlyArray<[Effect](Effect.md)>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Array of effects. See [`Effect`](Effect.md) type. For help on how to change this value, see [Editing Properties](../editing-properties.md).

---

### expanded: boolean

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Whether this container is shown as expanded in the layers panel.

---

### explicitVariableModes: { [collectionId: string]: string }

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The explicitly set modes for this node.
For `SceneNodes`, represents a subset of [`resolvedVariableModes`](properties/nodes-resolvedvariablemodes.md).
Note that this does not include [workspace and team-default modes](https://help.figma.com/hc/en-us/articles/12611253730071).

---

### exportAsync(settings?: [ExportSettings](ExportSettings.md)): Promise<Uint8Array>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

### exportAsync(settings: [ExportSettingsSVGString](ExportSettings.md#export-settings-svgstring)): Promise<string>

### exportAsync(settings: [ExportSettingsREST](ExportSettings.md#export-settings-rest)): Promise<Object>

Exports the node as an encoded image.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-exportasync.md)

---

### exportSettings: ReadonlyArray<[ExportSettings](ExportSettings.md)>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

List of export settings stored on the node. For help on how to change this value, see [Editing Properties](../editing-properties.md).

---

### fillGeometry: [VectorPaths](VectorPath.md#vector-paths) [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

An array of paths representing the object fills relative to the node.

---

### [fillStyleId](properties/nodes-fillstyleid.md): string | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableCellNode](TableCellNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The id of the [`PaintStyle`](PaintStyle.md) object that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](properties/nodes-fillstyleid.md)

---

### [fills](properties/nodes-fills.md): ReadonlyArray<[Paint](Paint.md)> | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableCellNode](TableCellNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](../editing-properties.md).

[View more →](properties/nodes-fills.md)

---

### [findAll](properties/nodes-findall.md)(callback?: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node)[]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findall.md)

---

### [findAllWithCriteria](properties/nodes-findallwithcriteria.md)<T extends NodeType[]>(criteria: [FindAllCriteria](FindAllCriteria.md)<T>): Array<{ type: T[number] } & [SceneNode](nodes.md#scene-node)>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes that satisfy all of specified criteria.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findallwithcriteria.md)

---

### [findChild](properties/nodes-findchild.md)(callback: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node) | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Searches the immediate children of this node (i.e. not including the children's children). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findchild.md)

---

### [findChildren](properties/nodes-findchildren.md)(callback?: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node)[]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Searches the immediate children of this node (i.e. not including the children's children). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findchildren.md)

---

### [findOne](properties/nodes-findone.md)(callback: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node) | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Searches this entire subtree (this node's children, its children's children, etc). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findone.md)

---

### [findWidgetNodesByWidgetId](properties/nodes-findwidgetnodesbywidgetid.md)(widgetId: string): Array<[WidgetNode](WidgetNode.md)>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Searches this entire subtree (this node's children, its children's children, etc). Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findwidgetnodesbywidgetid.md)

---

### fontName: [FontName](FontName.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

The font family (e.g. "Inter"), and font style (e.g. "Regular"). Setting this property to a different value requires the new font to be loaded.

---

### fontSize: number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

The size of the font. Has minimum value of 1.

---

### fontWeight: number | [figma.mixed](properties/figma-mixed.md) [readonly]

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

The weight of the font (e.g. 400 for "Regular", 700 for "Bold").

---

### getCSSAsync(): Promise<{ [key: string]: string }>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Resolves to a JSON object of CSS properties of the node. This is the same CSS that Figma shows in the inspect panel and is helpful if you are building a [plugin for code generation](../codegen-plugins.md).

---

### getDevResourcesAsync(options?: { includeChildren: boolean }): Promise<[DevResourceWithNodeId](DevResource.md#dev-resource-with-node-id)[]>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Gets all of the dev resources on a node. This includes any inherited dev resources from components and component sets.

[View more →](properties/nodes-getdevresourcesasync.md)

---

### getMeasurements(): [Measurement](Measurement.md)[]

Supported on:

- [PageNode](PageNode.md)

Get all measurements in the current page.

Learn more about measurements in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935).

---

### getMeasurementsForNode(node: [SceneNode](nodes.md#scene-node)): [Measurement](Measurement.md)[]

Supported on:

- [PageNode](PageNode.md)

Get all measurements pointing to a node in the current page. This includes all measurements whose start *or* end node is the node passed in.

---

### getPluginData(key: string): string

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EffectStyle](EffectStyle.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GridStyle](GridStyle.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PaintStyle](PaintStyle.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextStyle](TextStyle.md)
- [TransformGroupNode](TransformGroupNode.md)
- [Variable](Variable.md)
- [VariableCollection](VariableCollection.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Retrieves custom information that was stored on this node or style using [`setPluginData`](properties/nodes-setplugindata.md). If there is no data stored for the provided key, an empty string is returned.

---

### getPluginDataKeys(): string[]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EffectStyle](EffectStyle.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GridStyle](GridStyle.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PaintStyle](PaintStyle.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextStyle](TextStyle.md)
- [TransformGroupNode](TransformGroupNode.md)
- [Variable](Variable.md)
- [VariableCollection](VariableCollection.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Retrieves a list of all keys stored on this node or style using using [`setPluginData`](properties/nodes-setplugindata.md). This enables iterating through all data stored privately on a node or style by your plugin.

---

### getPublishStatusAsync(): Promise<[PublishStatus](PublishStatus.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EffectStyle](EffectStyle.md)
- [GridStyle](GridStyle.md)
- [PaintStyle](PaintStyle.md)
- [TextStyle](TextStyle.md)

Gets the status of this style/component in the team library.

---

### getRangeAllFontNames(start: number, end: number): [FontName](FontName.md)[]

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `fontName`s from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeBoundVariable(start: number, end: number, field: [VariableBindableTextField](VariableBindableTextField.md)): [VariableAlias](VariableAlias.md) | null | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `boundVariable` for a given field from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeFillStyleId(start: number, end: number): string | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `fillStyleId` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeFills(start: number, end: number): [Paint](Paint.md)[] | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `fills` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeFontName(start: number, end: number): [FontName](FontName.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `fontName` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeFontSize(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `fontSize` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeFontWeight(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `fontWeight` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeHyperlink(start: number, end: number): [HyperlinkTarget](HyperlinkTarget.md) | null | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `hyperlink` from characters in range `start` (inclusive) to `end` (exclusive). Returns a [`HyperlinkTarget`](HyperlinkTarget.md) if the range contains exactly one hyperlink, or `null` if the range contains none.

---

### getRangeIndentation(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `indentation` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeLetterSpacing(start: number, end: number): [LetterSpacing](LetterSpacing.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `letterSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeLineHeight(start: number, end: number): [LineHeight](LineHeight.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeListOptions(start: number, end: number): [TextListOptions](TextListOptions.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textListOptions` from characters in range `start` (inclusive) to `end` (exclusive). Returns a [`TextListOptions`](TextListOptions.md)

---

### getRangeListSpacing(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `listSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeOpenTypeFeatures(start: number, end: number): { readonly [feature in [OpenTypeFeature](OpenTypeFeature.md)]: boolean} | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the [`openTypeFeatures`](properties/TextNode-opentypefeatures.md) from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeParagraphIndent(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `paragraphIndent` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeParagraphSpacing(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `paragraphSpacing` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextCase(start: number, end: number): [TextCase](TextCase.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textCase` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecoration(start: number, end: number): [TextDecoration](TextDecoration.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textDecoration` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecorationColor(start: number, end: number): [TextDecorationColor](TextDecorationColor.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textDecorationColor` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecorationOffset(start: number, end: number): [TextDecorationOffset](TextDecorationOffset.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textDecorationOffset` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecorationSkipInk(start: number, end: number): boolean | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textDecorationSkipInk` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecorationStyle(start: number, end: number): [TextDecorationStyle](TextDecorationStyle.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textDecorationStyle` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecorationThickness(start: number, end: number): [TextDecorationThickness](TextDecorationThickness.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textDecorationThickness` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextStyleId(start: number, end: number): string | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get the `textStyleId` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRelaunchData(): { [command: string]: string }

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Retreives the reluanch data stored on this node using [`setRelaunchData`](properties/nodes-setrelaunchdata.md)

---

### getSharedPluginData(namespace: string, key: string): string

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EffectStyle](EffectStyle.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GridStyle](GridStyle.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PaintStyle](PaintStyle.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextStyle](TextStyle.md)
- [TransformGroupNode](TransformGroupNode.md)
- [Variable](Variable.md)
- [VariableCollection](VariableCollection.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Retrieves custom information that was stored on this node or style using [`setSharedPluginData`](properties/nodes-setsharedplugindata.md). If there is no data stored for the provided namespace and key, an empty string is returned.

---

### getSharedPluginDataKeys(namespace: string): string[]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EffectStyle](EffectStyle.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GridStyle](GridStyle.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PaintStyle](PaintStyle.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextStyle](TextStyle.md)
- [TransformGroupNode](TransformGroupNode.md)
- [Variable](Variable.md)
- [VariableCollection](VariableCollection.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Retrieves a list of all keys stored on this node or style using [`setSharedPluginData`](properties/nodes-setsharedplugindata.md). This enables iterating through all data stored in a given namespace.

---

### [getStyledTextSegments](properties/TextNode-getstyledtextsegments.md)<StyledTextSegmentFields extends (keyof Omit< StyledTextSegment, 'characters' | 'start' | 'end' >)[]>(fields: StyledTextSegmentFields, start?: number, end?: number): Array<Pick<[StyledTextSegment](StyledTextSegment.md), StyledTextSegmentFields[number] | 'characters' | 'start' | 'end'>>

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Get text segments along with the desired text properties (font size, text case, etc...)

[View more →](properties/TextNode-getstyledtextsegments.md)

---

### getTopLevelFrame(): [FrameNode](FrameNode.md) | undefined

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Returns the top-most frame that contains this node. If the node is not inside a frame, this will return undefined.

info

This function will only work in Figma Design and will throw an error if called in FigJam or Slides.

---

### [gridChildHorizontalAlign](properties/nodes-gridchildhorizontalalign.md): 'MIN' | 'CENTER' | 'MAX' | 'AUTO'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of grid auto-layout frames. Controls the horizontal alignment of the node within its grid cell.

[View more →](properties/nodes-gridchildhorizontalalign.md)

---

### [gridChildVerticalAlign](properties/nodes-gridchildverticalalign.md): 'MIN' | 'CENTER' | 'MAX' | 'AUTO'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of grid auto-layout frames. Controls the vertical alignment of the node within its grid cell.

[View more →](properties/nodes-gridchildverticalalign.md)

---

### [gridColumnAnchorIndex](properties/nodes-gridcolumnanchorindex.md): number [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of grid auto-layout frames. Determines the starting column index for this node within the parent grid.

[View more →](properties/nodes-gridcolumnanchorindex.md)

---

### [gridColumnCount](properties/nodes-gridcolumncount.md): number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of columns in the grid.

[View more →](properties/nodes-gridcolumncount.md)

---

### [gridColumnGap](properties/nodes-gridcolumngap.md): number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the gap between columns in the grid.

[View more →](properties/nodes-gridcolumngap.md)

---

### [gridColumnSizes](properties/nodes-gridcolumnsizes.md): Array<[GridTrackSize](GridTrackSize.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`.
Returns an array of [`GridTrackSize`](GridTrackSize.md) objects representing the columns in the grid in order.

[View more →](properties/nodes-gridcolumnsizes.md)

---

### [gridColumnSpan](properties/nodes-gridcolumnspan.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of grid auto-layout frames. Determines the number of columns this node will span within the parent grid.

[View more →](properties/nodes-gridcolumnspan.md)

---

### [gridRowAnchorIndex](properties/nodes-gridrowanchorindex.md): number [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of grid auto-layout frames. Determines the starting row index for this node within the parent grid.

[View more →](properties/nodes-gridrowanchorindex.md)

---

### [gridRowCount](properties/nodes-gridrowcount.md): number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of rows in the grid.

[View more →](properties/nodes-gridrowcount.md)

---

### [gridRowGap](properties/nodes-gridrowgap.md): number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the gap between rows in the grid.

[View more →](properties/nodes-gridrowgap.md)

---

### [gridRowSizes](properties/nodes-gridrowsizes.md): Array<[GridTrackSize](GridTrackSize.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`.
Returns an array of [`GridTrackSize`](GridTrackSize.md) objects representing the rows in the grid in order.

[View more →](properties/nodes-gridrowsizes.md)

---

### [gridRowSpan](properties/nodes-gridrowspan.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of grid auto-layout frames. Determines the number of rows this node will span within the parent grid.

[View more →](properties/nodes-gridrowspan.md)

---

### gridStyleId: string

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

The id of the [`GridStyle`](GridStyle.md) object that the [`layoutGrids`](node-properties.md#layoutgrids) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setGridStyleIdAsync` to update the style.

---

### guides: ReadonlyArray<[Guide](Guide.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Array of [`Guide`](Guide.md) used inside the frame. Note that each frame has its own guides, separate from the canvas-wide guides. For help on how to change this value, see [Editing Properties](../editing-properties.md).

---

### handleMirroring: [HandleMirroring](HandleMirroring.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [HighlightNode](HighlightNode.md)
- [VectorNode](VectorNode.md)

Whether the vector handles are mirrored or independent.

---

### hangingList: boolean

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Whether numbered list counters or unordered list bullets hang outside the text box.

---

### hangingPunctuation: boolean

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Whether punctuation, like quotation marks, hangs outside the text box.

---

### hasMissingFont: boolean [readonly]

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Returns whether the text uses a font currently not available to the document.

---

### height: number [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The height of the node. Use a resizing method to change this value.

---

### horizontalPadding: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

**DEPRECATED:** Use `paddingLeft` and `paddingRight` instead.

---

### hyperlink: [HyperlinkTarget](HyperlinkTarget.md) | null | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

A [`HyperlinkTarget`](HyperlinkTarget.md) if the text node has exactly one hyperlink, or `null` if the node has none.

---

### [id](properties/nodes-id.md): string [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The unique identifier of a node. For example, `1:3`. The node id can be used with methods such as [`figma.getNodeByIdAsync`](figma.md#getnodebyidasync), but plugins typically don't need to use this since you can usually just access a node directly.

[View more →](properties/nodes-id.md)

---

### inferredAutoLayout: [InferredAutoLayoutResult](InferredAutoLayoutResult.md) | null

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Returns inferred auto layout properties of a [`FrameNode`](FrameNode.md) if applicable. Otherwise, returns `null`.

This is what Figma uses to power Dev Mode’s [code snippets](https://help.figma.com/hc/en-us/articles/15023124644247#Build_faster_with_customizable_code_snippets) feature, as it makes sure the generated code is more useful.

info

This method uses a heuristic to infer the auto layout properties.

---

### [inferredVariables](properties/nodes-inferredvariables.md)?: { readonly [field in [VariableBindableNodeField](VariableBindableNodeField.md)]?: [VariableAlias](VariableAlias.md)[]} & { fills: [VariableAlias](VariableAlias.md)[][]; strokes: [VariableAlias](VariableAlias.md)[][] } [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

An object, keyed by field, returning any variables that match the raw value of that field for the mode of the node (or the default variable value if no mode is set)

[View more →](properties/nodes-inferredvariables.md)

---

### [insertCharacters](properties/TextNode-insertcharacters.md)(start: number, characters: string, useStyle?: 'BEFORE' | 'AFTER'): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Insert `characters` at index `start` in the text.

[View more →](properties/TextNode-insertcharacters.md)

---

### [insertChild](properties/nodes-insertchild.md)(index: number, child: [SceneNode](nodes.md#scene-node)): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [InstanceNode](InstanceNode.md)
- [PageNode](PageNode.md)
- [SectionNode](SectionNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [TransformGroupNode](TransformGroupNode.md)

Adds a new child at the specified index in the [`children`](properties/nodes-children.md) array.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-insertchild.md)

---

### isAsset: boolean [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Returns true if Figma detects that a node is an asset, otherwise returns false. An asset is is either an icon or a raster image.

This property is useful if you're building a [plugin for code generation](../codegen-plugins.md).

info

This property uses a set of heuristics to determine if a node is an asset. At a high level an icon is a small vector graphic and an image is a node with an image fill.

---

### [isMask](properties/nodes-ismask.md): boolean

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Whether this node is a mask. A mask node masks its subsequent siblings.

[View more →](properties/nodes-ismask.md)

---

### [itemReverseZIndex](properties/nodes-itemreversezindex.md): boolean

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines the [canvas stacking order](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties#Canvas_stacking_order) of layers in this frame. When true, the first layer will be draw on top.

[View more →](properties/nodes-itemreversezindex.md)

---

### [itemSpacing](properties/nodes-itemspacing.md): number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines distance between children of the frame.

[View more →](properties/nodes-itemspacing.md)

---

### key: string [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EffectStyle](EffectStyle.md)
- [GridStyle](GridStyle.md)
- [PaintStyle](PaintStyle.md)
- [TextStyle](TextStyle.md)

The key to use with [`figma.importComponentByKeyAsync`](figma.md#importcomponentbykeyasync), [`figma.importComponentSetByKeyAsync`](figma.md#importcomponentsetbykeyasync) and [`figma.importStyleByKeyAsync`](figma.md#importstylebykeyasync). Note that while this key is present on local and published components, you can only import components that are already published.

---

### [layoutAlign](properties/nodes-layoutalign.md): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of auto-layout frames. Determines if the layer should stretch along the parent’s counter axis. Defaults to `“INHERIT”`.

[View more →](properties/nodes-layoutalign.md)

---

### layoutGrids: ReadonlyArray<[LayoutGrid](LayoutGrid.md)>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Array of [`LayoutGrid`](LayoutGrid.md) objects used as layout grids on this node. For help on how to change this value, see [Editing Properties](../editing-properties.md).

---

### [layoutGrow](properties/nodes-layoutgrow.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

This property is applicable only for direct children of auto-layout frames. Determines whether a layer should stretch along the parent’s primary axis. 0 corresponds to a fixed size and 1 corresponds to stretch.

[View more →](properties/nodes-layoutgrow.md)

---

### [layoutMode](properties/nodes-layoutmode.md): 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Determines whether this layer uses auto-layout to position its children. Defaults to "NONE".

[View more →](properties/nodes-layoutmode.md)

---

### [layoutPositioning](properties/nodes-layoutpositioning.md): 'AUTO' | 'ABSOLUTE'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

[View more →](properties/nodes-layoutpositioning.md)

---

### [layoutSizingHorizontal](properties/nodes-layoutsizinghorizontal.md): 'FIXED' | 'HUG' | 'FILL'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](properties/nodes-layoutgrow.md), [`layoutAlign`](properties/nodes-layoutalign.md), [`primaryAxisSizingMode`](properties/nodes-primaryaxissizingmode.md), and [`counterAxisSizingMode`](properties/nodes-counteraxissizingmode.md). This field maps directly to the "Horizontal sizing" dropdown in the Figma UI.

[View more →](properties/nodes-layoutsizinghorizontal.md)

---

### [layoutSizingVertical](properties/nodes-layoutsizingvertical.md): 'FIXED' | 'HUG' | 'FILL'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](properties/nodes-layoutgrow.md), [`layoutAlign`](properties/nodes-layoutalign.md), [`primaryAxisSizingMode`](properties/nodes-primaryaxissizingmode.md), and [`counterAxisSizingMode`](properties/nodes-counteraxissizingmode.md). This field maps directly to the "Vertical sizing" dropdown in the Figma UI.

[View more →](properties/nodes-layoutsizingvertical.md)

---

### [layoutWrap](properties/nodes-layoutwrap.md): 'NO\_WRAP' | 'WRAP'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Determines whether this layer should use wrapping auto-layout. Defaults to `"NO_WRAP"`.

[View more →](properties/nodes-layoutwrap.md)

---

### leadingTrim: [LeadingTrim](LeadingTrim.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The removal of the vertical space above and below text glyphs. Requires the font to be loaded.

---

### letterSpacing: [LetterSpacing](LetterSpacing.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

The spacing between the individual characters. Requires the font to be loaded.

---

### lineHeight: [LineHeight](LineHeight.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The spacing between the lines in a paragraph of text. Requires the font to be loaded.

---

### listSpacing: number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The vertical distance between lines of a list.

---

### lockAspectRatio(): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Locks the node's `targetAspectRatio` to the current ratio of its width and height.

---

### [locked](properties/nodes-locked.md): boolean

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Whether the node is locked or not, preventing certain user interactions on the canvas such as selecting and dragging. Does not affect a plugin's ability to write to those properties.

[View more →](properties/nodes-locked.md)

---

### maskType: [MaskType](MaskType.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Type of masking to use if this node is a mask. Defaults to `"ALPHA"`. You must check `isMask` to verify that this is a mask; changing `maskType` does not automatically turn on `isMask`, and a node that is not a mask can still have a `maskType`.

---

### maxHeight: number | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxHeight`.

---

### maxWidth: number | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxWidth`.

---

### minHeight: number | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to null to remove `minHeight`.

---

### minWidth: number | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `minWidth`.

---

### [name](properties/nodes-name.md): string

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The name of the layer that appears in the layers panel. Calling `figma.root.name` will return the name, read-only, of the current file.

[View more →](properties/nodes-name.md)

---

### [numberOfFixedChildren](properties/nodes-numberoffixedchildren.md): number

Supported on:

- [ComponentNode](ComponentNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlotNode](SlotNode.md)

Determines which children of the frame are fixed children in a scrolling frame.

[View more →](properties/nodes-numberoffixedchildren.md)

---

### opacity: number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Opacity of the node, as shown in the Layer panel. Must be between 0 and 1.

---

### [openTypeFeatures](properties/TextNode-opentypefeatures.md): { readonly [feature in [OpenTypeFeature](OpenTypeFeature.md)]: boolean} | [figma.mixed](properties/figma-mixed.md) [readonly]

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

[OpenType features](https://help.figma.com/hc/en-us/articles/4913951097367) that have been explicitly enabled or disabled.

[View more →](properties/TextNode-opentypefeatures.md)

---

### outlineStroke(): [VectorNode](VectorNode.md) | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

This method performs an action similar to using the "Outline Stroke" function in the editor from the right-click menu. However, this method creates and returns a new node while leaving the original intact. Returns `null` if the node has no strokes.

---

### [overflowDirection](properties/nodes-overflowdirection.md): [OverflowDirection](OverflowDirection.md)

Supported on:

- [ComponentNode](ComponentNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlotNode](SlotNode.md)

Determines whether a frame will scroll in presentation mode when the frame contains content that exceed the frame's bounds. Reflects the value shown in "Overflow Behavior" in the Prototype tab.

[View more →](properties/nodes-overflowdirection.md)

---

### overlayBackground: [OverlayBackground](Overlay.md#overlay-background) [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlotNode](SlotNode.md)

How this frame obscures the content under it when opened as an overlay.

---

### overlayBackgroundInteraction: [OverlayBackgroundInteraction](Overlay.md#overlay-background-interaction) [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlotNode](SlotNode.md)

How the user can interact with the content under this frame when opened as an overlay.

---

### overlayPositionType: [OverlayPositionType](Overlay.md#overlay-position-type) [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlotNode](SlotNode.md)

How this frame is positioned when opened as an overlay.

---

### paddingBottom: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines the bottom padding between the border of the frame and its children.

---

### paddingLeft: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines the left padding between the border of the frame and its children.

---

### paddingRight: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines the right padding between the border of the frame and its children.

---

### paddingTop: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines the top padding between the border of the frame and its children.

---

### paragraphIndent: number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The indentation of paragraphs (offset of the first line from the left). Setting this property requires the font the be loaded.

---

### paragraphSpacing: number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The vertical distance between paragraphs. Setting this property requires the font to be loaded.

---

### [parent](properties/nodes-parent.md): ([BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin)) | null [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](properties/nodes-appendchild.md).

[View more →](properties/nodes-parent.md)

---

### [primaryAxisAlignItems](properties/nodes-primaryaxisalignitems.md): 'MIN' | 'MAX' | 'CENTER' | 'SPACE\_BETWEEN'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the primary axis direction.

[View more →](properties/nodes-primaryaxisalignitems.md)

---

### [primaryAxisSizingMode](properties/nodes-primaryaxissizingmode.md): 'FIXED' | 'AUTO'

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines whether the primary axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](properties/nodes-primaryaxissizingmode.md)

---

### [reactions](properties/nodes-reactions.md): ReadonlyArray<[Reaction](Reaction.md)>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

List of [Reactions](Reaction.md) on this node, which includes both the method of interaction with this node in a prototype, and the behavior of that interaction. For help on how to change this value, see [Editing Properties](../editing-properties.md).

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setReactionsAsync` to update the value.

[View more →](properties/nodes-reactions.md)

---

### [relativeTransform](properties/nodes-relativetransform.md): [Transform](Transform.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The position of a node relative to its **containing parent** as a [`Transform`](Transform.md) matrix. Not used for scaling, see `width` and `height` instead. Read the details page to understand the nuances of this property.

[View more →](properties/nodes-relativetransform.md)

---

### remote: boolean [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EffectStyle](EffectStyle.md)
- [GridStyle](GridStyle.md)
- [PaintStyle](PaintStyle.md)
- [TextStyle](TextStyle.md)

Whether this style/component is a remote style/component that doesn't live in the file (i.e. is from the team library). Remote components are read-only: attempts to change their properties will throw.

---

### [remove](properties/nodes-remove.md)(): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Removes this node and **all of its children** from the document.

[View more →](properties/nodes-remove.md)

---

### [removed](properties/nodes-removed.md): boolean [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Returns true if this node has been removed since it was first accessed. If your plugin stays open for a while and stores references to nodes, you should write your code defensively and check that the nodes haven't been removed by the user.

[View more →](properties/nodes-removed.md)

---

### [rescale](properties/nodes-rescale.md)(scale: number): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Rescales the node. This API function is the equivalent of using the Scale Tool from the toolbar.

[View more →](properties/nodes-rescale.md)

---

### [resize](properties/nodes-resize.md)(width: number, height: number): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Resizes the node. If the node contains children with constraints, it applies those constraints during resizing. If the parent has auto-layout, causes the parent to be resized.

[View more →](properties/nodes-resize.md)

---

### [resizeWithoutConstraints](properties/nodes-resizewithoutconstraints.md)(width: number, height: number): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Resizes the node. Children of the node are never resized, even if those children have constraints. If the parent has auto-layout, causes the parent to be resized (this constraint cannot be ignored).

[View more →](properties/nodes-resizewithoutconstraints.md)

---

### [resolvedVariableModes](properties/nodes-resolvedvariablemodes.md): { [collectionId: string]: string }

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The resolved mode for this node for each variable collection in this file.

[View more →](properties/nodes-resolvedvariablemodes.md)

---

### [rotation](properties/nodes-rotation.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The rotation of the node in degrees. Returns values from -180 to 180. Identical to `Math.atan2(-m10, m00)` in the [`relativeTransform`](properties/nodes-relativetransform.md) matrix. When setting `rotation`, it will also set `m00`, `m01`, `m10`, `m11`.

[View more →](properties/nodes-rotation.md)

---

### setBoundVariable(field: [VariableBindableNodeField](VariableBindableNodeField.md) | [VariableBindableTextField](VariableBindableTextField.md), variable: [Variable](Variable.md) | null): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](../working-with-variables.md) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

[View more →](properties/nodes-setboundvariable.md)

---

### setDevResourcePreviewAsync(url: string, preview: PlainTextElement): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

caution

This is a private API only available to [Figma partners](https://www.figma.com/partners/)

---

### setEffectStyleIdAsync(styleId: string): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Set the [`EffectStyle`](EffectStyle.md) that the properties of this node are linked to.

---

### setExplicitVariableModeForCollection(collection: [VariableCollection](VariableCollection.md), modeId: string): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Sets an explicit mode for the given collection on this node

[View more →](properties/ExplicitVariableModesMixin-setexplicitvariablemodeforcollection.md)

---

### setFillStyleIdAsync(styleId: string): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableCellNode](TableCellNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Sets the [`PaintStyle`](PaintStyle.md) that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

---

### setFillsAsync(paints: ReadonlyArray<[Paint](Paint.md)>): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableCellNode](TableCellNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Sets the fills of the node asynchronously. This is the only way to set pattern fills on a node, since we need to ensure that the source node of the pattern is loaded first. See [Adding Pattern Fills and Strokes](../adding-pattern-fills-and-strokes.md) for more information.

---

### [setGridChildPosition](properties/nodes-setgridchildposition.md)(rowIndex: number, columnIndex: number): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SliceNode](SliceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Applicable only on direct children of 'GRID' auto-layout frames. Sets the position of the node

[View more →](properties/nodes-setgridchildposition.md)

---

### setGridStyleIdAsync(styleId: string): Promise<void>

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Set the [`GridStyle`](GridStyle.md) that the [`layoutGrids`](node-properties.md#layoutgrids) property of this node is linked to.

---

### [setPluginData](properties/nodes-setplugindata.md)(key: string, value: string): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EffectStyle](EffectStyle.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GridStyle](GridStyle.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PaintStyle](PaintStyle.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextStyle](TextStyle.md)
- [TransformGroupNode](TransformGroupNode.md)
- [Variable](Variable.md)
- [VariableCollection](VariableCollection.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Lets you store custom information on any node or style, **private** to your plugin. The total size of your entry (`pluginId`, `key`, `value`) cannot exceed 100 kB.

[View more →](properties/nodes-setplugindata.md)

---

### setRangeBoundVariable(start: number, end: number, field: [VariableBindableTextField](VariableBindableTextField.md), variable: [Variable](Variable.md) | null): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `boundVariable` for a given field from characters in range `start` (inclusive) to `end` (exclusive). Requires any new fonts to be loaded.

---

### setRangeFillStyleId(start: number, end: number, value: string): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

**DEPRECATED:** Use `setRangeFillStyleIdAsync` instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Set the `fillStyleId` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeFillStyleIdAsync(start: number, end: number, styleId: string): Promise<void>

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the provided [`PaintStyle`](PaintStyle.md) as a fill to characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeFills(start: number, end: number, value: [Paint](Paint.md)[]): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `fills` from characters in range `start` (inclusive) to `end` (exclusive). Requires font to be loaded.

Can be bound to color variables by using [`setBoundVariableForPaint`](figma-variables.md#setboundvariableforpaint) on one or more of the provided `Paint`s

---

### setRangeFontName(start: number, end: number, value: [FontName](FontName.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `fontName` from characters in range `start` (inclusive) to `end` (exclusive). Requires the new font to be loaded.

---

### setRangeFontSize(start: number, end: number, value: number): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `fontSize` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeHyperlink(start: number, end: number, value: [HyperlinkTarget](HyperlinkTarget.md) | null): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `hyperlink` from characters in range `start` (inclusive) to `end` (exclusive). Removes the hyperlink in range if `value` is `null`.

---

### setRangeIndentation(start: number, end: number, value: number): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `indentation` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeLetterSpacing(start: number, end: number, value: [LetterSpacing](LetterSpacing.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `letterSpacing` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeLineHeight(start: number, end: number, value: [LineHeight](LineHeight.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeListOptions(start: number, end: number, value: [TextListOptions](TextListOptions.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textListOptions` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeListSpacing(start: number, end: number, value: number): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `listSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeParagraphIndent(start: number, end: number, value: number): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `paragraphIndent` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeParagraphSpacing(start: number, end: number, value: number): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `paragraphSpacing` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextCase(start: number, end: number, value: [TextCase](TextCase.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textCase` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextDecoration(start: number, end: number, value: [TextDecoration](TextDecoration.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textDecoration` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextDecorationColor(start: number, end: number, value: [TextDecorationColor](TextDecorationColor.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textDecorationColor` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextDecorationOffset(start: number, end: number, value: [TextDecorationOffset](TextDecorationOffset.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textDecorationOffset` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextDecorationSkipInk(start: number, end: number, value: boolean): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textDecorationSkipInk` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextDecorationStyle(start: number, end: number, value: [TextDecorationStyle](TextDecorationStyle.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textDecorationStyle` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextDecorationThickness(start: number, end: number, value: [TextDecorationThickness](TextDecorationThickness.md)): void

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the `textDecorationThickness` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextStyleId(start: number, end: number, value: string): void

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

**DEPRECATED:** Use `setRangeTextStyleIdAsync` instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Set the `textStyleId` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextStyleIdAsync(start: number, end: number, styleId: string): Promise<void>

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Set the provided [`TextStyle`](TextStyle.md) to characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setReactionsAsync(reactions: Array<[Reaction](Reaction.md)>): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Updates the reactions on this node. See [`reactions`](properties/nodes-reactions.md) for a usage example.

---

### [setRelaunchData](properties/nodes-setrelaunchdata.md)(data: { [command: string]: string }): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Sets state on the node to show a button and description when the node is selected. Clears the button and description when `relaunchData` is `{}`.

info

In Figma and Dev Mode, this shows up in the properties panel. In FigJam, this shows up in the property menu. See [here](properties/nodes-setrelaunchdata.md#example-figma-design-ui) for examples.

[View more →](properties/nodes-setrelaunchdata.md)

---

### [setSharedPluginData](properties/nodes-setsharedplugindata.md)(namespace: string, key: string, value: string): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EffectStyle](EffectStyle.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GridStyle](GridStyle.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PaintStyle](PaintStyle.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextStyle](TextStyle.md)
- [TransformGroupNode](TransformGroupNode.md)
- [Variable](Variable.md)
- [VariableCollection](VariableCollection.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

[View more →](properties/nodes-setsharedplugindata.md)

---

### setStrokeStyleIdAsync(styleId: string): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Set the [`PaintStyle`](PaintStyle.md) that the [`strokes`](properties/nodes-strokes.md) property of this node is linked to.

---

### setStrokesAsync(strokes: ReadonlyArray<[Paint](Paint.md)>): Promise<void>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Sets the strokes of the node asynchronously. This is the only way to set pattern strokes on a node, since we need to ensure that the source node of the pattern is loaded first. See [Adding Pattern Fills and Strokes](../adding-pattern-fills-and-strokes.md) for more information.

---

### setVectorNetworkAsync(vectorNetwork: [VectorNetwork](VectorNetwork.md)): Promise<void>

Supported on:

- [HighlightNode](HighlightNode.md)
- [VectorNode](VectorNode.md)

Updates the vector network.

---

### [strokeAlign](properties/nodes-strokealign.md): 'CENTER' | 'INSIDE' | 'OUTSIDE'

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The alignment of the stroke with respect to the boundaries of the shape.

[View more →](properties/nodes-strokealign.md)

---

### strokeBottomWeight: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Determines the bottom stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

---

### [strokeCap](properties/nodes-strokecap.md): [StrokeCap](StrokeCap.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The decoration applied to vertices which have only one connected segment.

[View more →](properties/nodes-strokecap.md)

---

### strokeGeometry: [VectorPaths](VectorPath.md#vector-paths) [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

An array of paths representing the object strokes relative to the node.
StrokeGeometry is always from the center regardless of the nodes `strokeAlign`.

---

### [strokeJoin](properties/nodes-strokejoin.md): [StrokeJoin](StrokeJoin.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The decoration applied to vertices which have two or more connected segments.

[View more →](properties/nodes-strokejoin.md)

---

### strokeLeftWeight: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Determines the left stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

---

### strokeMiterLimit: number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The miter limit on the stroke. This is the same as the [SVG miter limit](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit).

---

### strokeRightWeight: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Determines the right stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

---

### strokeStyleId: string

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The id of the [`PaintStyle`](PaintStyle.md) object that the [`strokes`](properties/nodes-strokes.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setStrokeStyleIdAsync` to update the style.

---

### strokeTopWeight: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Determines the top stroke weight on a rectangle node or frame-like node. Must be non-negative and can be fractional.

---

### strokeWeight: number | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The thickness of the stroke, in pixels. This value must be non-negative and can be fractional.

caution

For rectangle nodes or frame-like nodes using different individual stroke weights, this property will return [`figma.mixed`](properties/figma-mixed.md).

info

For rectangle nodes or frame-like nodes, individual stroke weights can be set for each side using the following properties:

- [`strokeTopWeight`](node-properties.md#stroketopweight)
- [`strokeBottomWeight`](node-properties.md#strokebottomweight)
- [`strokeLeftWeight`](node-properties.md#strokeleftweight)
- [`strokeRightWeight`](node-properties.md#strokerightweight)

---

### [strokes](properties/nodes-strokes.md): ReadonlyArray<[Paint](Paint.md)>

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

The paints used to fill the area of the shape's strokes. For help on how to change this value, see [Editing Properties](../editing-properties.md).

[View more →](properties/nodes-strokes.md)

---

### [strokesIncludedInLayout](properties/nodes-strokesincludedinlayout.md): boolean

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

Applicable only on auto-layout frames. Determines whether strokes are included in [layout calculations](https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout#01JT9NA4HVT02ZPE7BA86SFCD6). When true, auto-layout frames behave like css `box-sizing: border-box`.

[View more →](properties/nodes-strokesincludedinlayout.md)

---

### [stuckNodes](properties/nodes-stucknodes.md): [SceneNode](nodes.md#scene-node)[] [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

An array of nodes that are "stuck" to this node. In FigJam, stamps, highlights, and some widgets can "stick"
to other nodes if they are dragged on top of another node.

[View more →](properties/nodes-stucknodes.md)

---

### [stuckTo](properties/nodes-stuckto.md): [SceneNode](nodes.md#scene-node) | null

Supported on:

- [HighlightNode](HighlightNode.md)
- [StampNode](StampNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

If this node is stuck to another node this property returns that node or null.

[View more →](properties/nodes-stuckto.md)

---

### [targetAspectRatio](properties/nodes-targetaspectratio.md): [Vector](Vector.md) | null [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

When toggled, causes the layer to keep its proportions when the user resizes it via auto layout, constraints, the properties panel, or on-canvas.
If not set, the node does NOT resize toward a specific targetAspectRatio.

[View more →](properties/nodes-targetaspectratio.md)

---

### textCase: [TextCase](TextCase.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TextSublayerNode](TextSublayer.md)

Overrides the case of the raw characters in the text node. Requires the font to be loaded.

---

### textDecoration: [TextDecoration](TextDecoration.md) | [figma.mixed](properties/figma-mixed.md)

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Whether the text is underlined or has a strikethrough. Requires the font to be loaded.

---

### textDecorationColor: [TextDecorationColor](TextDecorationColor.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The text decoration color. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationOffset: [TextDecorationOffset](TextDecorationOffset.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The text decoration offset. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationSkipInk: boolean | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

Whether the text decoration skips descenders. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationStyle: [TextDecorationStyle](TextDecorationStyle.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The text decoration style (e.g. "SOLID"). If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationThickness: [TextDecorationThickness](TextDecorationThickness.md) | [figma.mixed](properties/figma-mixed.md) | null

Supported on:

- [TextNode](TextNode.md)
- [TextSublayerNode](TextSublayer.md)

The text decoration thickness. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### [toString](properties/nodes-tostring.md)(): string

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [DocumentNode](DocumentNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PageNode](PageNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](properties/nodes-tostring.md)

---

### topLeftRadius: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

---

### topRightRadius: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

---

### unlockAspectRatio(): void

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)

Unlocks the node's `targetAspectRatio`.

---

### [variableWidthStrokeProperties](properties/nodes-variablewidthstrokeproperties.md): [VariableWidthStrokeProperties](VariableWidthStrokeProperties.md) | null

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [EllipseNode](EllipseNode.md)
- [FrameNode](FrameNode.md)
- [InstanceNode](InstanceNode.md)
- [LineNode](LineNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)
- [StarNode](StarNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [VectorNode](VectorNode.md)

The variable width stroke properties for the node.

[View more →](properties/nodes-variablewidthstrokeproperties.md)

---

### [variantProperties](properties/nodes-variantproperties.md): { [property: string]: string } | null [readonly]

Supported on:

- [ComponentNode](ComponentNode.md)
- [InstanceNode](InstanceNode.md)

**DEPRECATED:** Use [`componentProperties`](InstanceNode.md#componentproperties) instead.

Variant properties and values for this node. Is `null` for nodes that are not variants.

[View more →](properties/nodes-variantproperties.md)

---

### vectorNetwork: [VectorNetwork](VectorNetwork.md)

Supported on:

- [HighlightNode](HighlightNode.md)
- [VectorNode](VectorNode.md)

Exposes a complete, but more complex representation of vectors as a network of edges between vectices. See [`VectorNetwork`](VectorNetwork.md).

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setVectorNetworkAsync` to update the value.

---

### vectorPaths: [VectorPaths](VectorPath.md#vector-paths)

Supported on:

- [HighlightNode](HighlightNode.md)
- [VectorNode](VectorNode.md)

Exposes a simple, but incomplete representation of vectors as path. See [`VectorPaths`](VectorPath.md)

---

### verticalPadding: number

Supported on:

- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [FrameNode](FrameNode.md)
- [InferredAutoLayoutResult](InferredAutoLayoutResult.md)
- [InstanceNode](InstanceNode.md)
- [SlideNode](SlideNode.md)
- [SlotNode](SlotNode.md)

**DEPRECATED:** Use `paddingTop` and `paddingBottom` instead.

---

### [visible](properties/nodes-visible.md): boolean

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

Whether the node is visible or not. Does not affect a plugin's ability to access the node.

[View more →](properties/nodes-visible.md)

---

### width: number [readonly]

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The width of the node. Use a resizing method to change this value.

---

### [x](properties/nodes-x.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The position of the node. Identical to `relativeTransform[0][2]`.

[View more →](properties/nodes-x.md)

---

### [y](properties/nodes-y.md): number

Supported on:

- [BooleanOperationNode](BooleanOperationNode.md)
- [CodeBlockNode](CodeBlockNode.md)
- [ComponentNode](ComponentNode.md)
- [ComponentSetNode](ComponentSetNode.md)
- [ConnectorNode](ConnectorNode.md)
- [EllipseNode](EllipseNode.md)
- [EmbedNode](EmbedNode.md)
- [FrameNode](FrameNode.md)
- [GroupNode](GroupNode.md)
- [HighlightNode](HighlightNode.md)
- [InstanceNode](InstanceNode.md)
- [InteractiveSlideElementNode](InteractiveSlideElementNode.md)
- [LineNode](LineNode.md)
- [LinkUnfurlNode](LinkUnfurlNode.md)
- [MediaNode](MediaNode.md)
- [PolygonNode](PolygonNode.md)
- [RectangleNode](RectangleNode.md)
- [SectionNode](SectionNode.md)
- [ShapeWithTextNode](ShapeWithTextNode.md)
- [SliceNode](SliceNode.md)
- [SlideGridNode](SlideGridNode.md)
- [SlideNode](SlideNode.md)
- [SlideRowNode](SlideRowNode.md)
- [SlotNode](SlotNode.md)
- [StampNode](StampNode.md)
- [StarNode](StarNode.md)
- [StickyNode](StickyNode.md)
- [TableNode](TableNode.md)
- [TextNode](TextNode.md)
- [TextPathNode](TextPathNode.md)
- [TransformGroupNode](TransformGroupNode.md)
- [VectorNode](VectorNode.md)
- [WashiTapeNode](WashiTapeNode.md)
- [WidgetNode](WidgetNode.md)

The position of the node. Identical to `relativeTransform[1][2]`.

[View more →](properties/nodes-y.md)

---

[Previous

setWidgetSyncedState](properties/WidgetNode-setwidgetsyncedstate.md)[Next

addDevResourceAsync](properties/nodes-adddevresourceasync.md)
