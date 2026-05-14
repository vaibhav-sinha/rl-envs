<!-- source: https://developers.figma.com/docs/plugins/api/SectionNode -->

- Plugins
- [Node Types](nodes.md)
- SectionNode

On this page

[Sections](https://help.figma.com/hc/en-us/articles/4939765379351-Organize-your-FigJam-board-with-sections) in FigJam are used to organize related objects. Sections can be created using [`figma.createSection`](figma.md#createsection).

## Section properties[​](#section-properties "Direct link to Section properties")

### type: 'SECTION' [readonly]

The type of this node, represented by the string literal "SECTION"

---

### sectionContentsHidden: boolean

Whether the section node contents are [marked as hidden](https://help.figma.com/hc/en-us/articles/4939765379351-Organize-your-FigJam-board-with-sections#Hide_section).

---

### clone(): [SectionNode](SectionNode.md)

Create a copy of this node. By default, the duplicate will be parented under `figma.currentPage`.

---

### resizeWithoutConstraints(width: number, height: number): void

Resizes the section node without constraints.

[View more →](properties/SectionNode-resizewithoutconstraints.md)

---

### resize(width: number, height: number): void

Resizes the section node. Sections do not propagate constraints to their
children, so this behaves equivalently to [`resizeWithoutConstraints`](properties/SectionNode-resizewithoutconstraints.md)
and is provided to match the resize ergonomics of other resizable nodes.

[View more →](properties/SectionNode-resize.md)

---

### devStatus: [DevStatus](DevStatus.md)

Whether the node is marked [ready for development](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#01H8CR3K6V9S02RK503QCX0367) or [completed](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode#01H8CR3K6V9S02RK503QCX0367).

There are some restrictions on how `devStatus` can be set:

- Can only be set on a node directly under a page or section
- Cannot be set on a node that is inside another node that already has a `devStatus`

---

## Base node properties[​](#base-node-properties "Direct link to Base node properties")

### [id](properties/nodes-id.md): string [readonly]

The unique identifier of a node. For example, `1:3`. The node id can be used with methods such as [`figma.getNodeByIdAsync`](figma.md#getnodebyidasync), but plugins typically don't need to use this since you can usually just access a node directly.

[View more →](properties/nodes-id.md)

---

### [parent](properties/nodes-parent.md): ([BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin)) | null [readonly]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](properties/nodes-appendchild.md).

[View more →](properties/nodes-parent.md)

---

### [name](properties/nodes-name.md): string

The name of the layer that appears in the layers panel. Calling `figma.root.name` will return the name, read-only, of the current file.

[View more →](properties/nodes-name.md)

---

### [removed](properties/nodes-removed.md): boolean [readonly]

Returns true if this node has been removed since it was first accessed. If your plugin stays open for a while and stores references to nodes, you should write your code defensively and check that the nodes haven't been removed by the user.

[View more →](properties/nodes-removed.md)

---

### [toString](properties/nodes-tostring.md)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](properties/nodes-tostring.md)

---

### [remove](properties/nodes-remove.md)(): void

Removes this node and **all of its children** from the document.

[View more →](properties/nodes-remove.md)

---

### [setRelaunchData](properties/nodes-setrelaunchdata.md)(data: { [command: string]: string }): void

Sets state on the node to show a button and description when the node is selected. Clears the button and description when `relaunchData` is `{}`.

info

In Figma and Dev Mode, this shows up in the properties panel. In FigJam, this shows up in the property menu. See [here](properties/nodes-setrelaunchdata.md#example-figma-design-ui) for examples.

[View more →](properties/nodes-setrelaunchdata.md)

---

### getRelaunchData(): { [command: string]: string }

Retreives the reluanch data stored on this node using [`setRelaunchData`](properties/nodes-setrelaunchdata.md)

---

### isAsset: boolean [readonly]

Returns true if Figma detects that a node is an asset, otherwise returns false. An asset is is either an icon or a raster image.

This property is useful if you're building a [plugin for code generation](../codegen-plugins.md).

info

This property uses a set of heuristics to determine if a node is an asset. At a high level an icon is a small vector graphic and an image is a node with an image fill.

---

### getCSSAsync(): Promise<{ [key: string]: string }>

Resolves to a JSON object of CSS properties of the node. This is the same CSS that Figma shows in the inspect panel and is helpful if you are building a [plugin for code generation](../codegen-plugins.md).

---

### getTopLevelFrame(): [FrameNode](FrameNode.md) | undefined

Returns the top-most frame that contains this node. If the node is not inside a frame, this will return undefined.

info

This function will only work in Figma Design and will throw an error if called in FigJam or Slides.

---

## Plugin data properties[​](#plugin-data-properties "Direct link to Plugin data properties")

### getPluginData(key: string): string

Retrieves custom information that was stored on this node or style using [`setPluginData`](properties/nodes-setplugindata.md). If there is no data stored for the provided key, an empty string is returned.

---

### [setPluginData](properties/nodes-setplugindata.md)(key: string, value: string): void

Lets you store custom information on any node or style, **private** to your plugin. The total size of your entry (`pluginId`, `key`, `value`) cannot exceed 100 kB.

[View more →](properties/nodes-setplugindata.md)

---

### getPluginDataKeys(): string[]

Retrieves a list of all keys stored on this node or style using using [`setPluginData`](properties/nodes-setplugindata.md). This enables iterating through all data stored privately on a node or style by your plugin.

---

### getSharedPluginData(namespace: string, key: string): string

Retrieves custom information that was stored on this node or style using [`setSharedPluginData`](properties/nodes-setsharedplugindata.md). If there is no data stored for the provided namespace and key, an empty string is returned.

---

### [setSharedPluginData](properties/nodes-setsharedplugindata.md)(namespace: string, key: string, value: string): void

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

[View more →](properties/nodes-setsharedplugindata.md)

---

### getSharedPluginDataKeys(namespace: string): string[]

Retrieves a list of all keys stored on this node or style using [`setSharedPluginData`](properties/nodes-setsharedplugindata.md). This enables iterating through all data stored in a given namespace.

---

## Dev resource properties[​](#dev-resource-properties "Direct link to Dev resource properties")

### getDevResourcesAsync(options?: { includeChildren: boolean }): Promise<[DevResourceWithNodeId](DevResource.md#dev-resource-with-node-id)[]>

Gets all of the dev resources on a node. This includes any inherited dev resources from components and component sets.

[View more →](properties/nodes-getdevresourcesasync.md)

---

### addDevResourceAsync(url: string, name?: string): Promise<void>

Adds a dev resource to a node. This will fail if the node already has a dev resource with the same url.

[View more →](properties/nodes-adddevresourceasync.md)

---

### editDevResourceAsync(currentUrl: string, newValue: { name: string; url: string }): Promise<void>

Edits a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](properties/nodes-editdevresourceasync.md)

---

### deleteDevResourceAsync(url: string): Promise<void>

Deletes a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

[View more →](properties/nodes-deletedevresourceasync.md)

---

### setDevResourcePreviewAsync(url: string, preview: PlainTextElement): Promise<void>

caution

This is a private API only available to [Figma partners](https://www.figma.com/partners/)

---

## Layout-related properties[​](#layout-related-properties "Direct link to Layout-related properties")

### [x](properties/nodes-x.md): number

The position of the node. Identical to `relativeTransform[0][2]`.

[View more →](properties/nodes-x.md)

---

### [y](properties/nodes-y.md): number

The position of the node. Identical to `relativeTransform[1][2]`.

[View more →](properties/nodes-y.md)

---

### width: number [readonly]

The width of the node. Use a resizing method to change this value.

---

### height: number [readonly]

The height of the node. Use a resizing method to change this value.

---

### minWidth: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `minWidth`.

---

### maxWidth: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxWidth`.

---

### minHeight: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to null to remove `minHeight`.

---

### maxHeight: number | null

Applicable only to auto-layout frames and their direct children. Value must be positive. Set to `null` to remove `maxHeight`.

---

### [relativeTransform](properties/nodes-relativetransform.md): [Transform](Transform.md)

The position of a node relative to its **containing parent** as a [`Transform`](Transform.md) matrix. Not used for scaling, see `width` and `height` instead. Read the details page to understand the nuances of this property.

[View more →](properties/nodes-relativetransform.md)

---

### absoluteTransform: [Transform](Transform.md) [readonly]

The position of a node relative to its **containing page** as a [`Transform`](Transform.md) matrix.

---

### absoluteBoundingBox: [Rect](Rect.md) | null [readonly]

The bounds of the node that does not include rendered properties like drop shadows or strokes. The `x` and `y` inside this property represent the absolute position of the node on the page.

---

## Scene node properties[​](#scene-node-properties "Direct link to Scene node properties")

### [visible](properties/nodes-visible.md): boolean

Whether the node is visible or not. Does not affect a plugin's ability to access the node.

[View more →](properties/nodes-visible.md)

---

### [locked](properties/nodes-locked.md): boolean

Whether the node is locked or not, preventing certain user interactions on the canvas such as selecting and dragging. Does not affect a plugin's ability to write to those properties.

[View more →](properties/nodes-locked.md)

---

### [stuckNodes](properties/nodes-stucknodes.md): [SceneNode](nodes.md#scene-node)[] [readonly]

An array of nodes that are "stuck" to this node. In FigJam, stamps, highlights, and some widgets can "stick"
to other nodes if they are dragged on top of another node.

[View more →](properties/nodes-stucknodes.md)

---

### attachedConnectors: [ConnectorNode](ConnectorNode.md)[] [readonly]

An array of `ConnectorNode`s that are attached to a node.

---

### componentPropertyReferences: { [nodeProperty in 'visible' | 'characters' | 'mainComponent']?: string} | null

All component properties that are attached on this node. A node can only have `componentPropertyReferences` if it is a component sublayer or an instance sublayer. It will be `null` otherwise. The value in the key-value pair refers to the component property name as returned by `componentPropertyDefinitions` on the containing component, component set or main component (for instances).

When setting, may throw the following errors: cannotApplySlotPropertyToNonFrameNode, cannotApplySlotPropertyToFrameWithGrid, or cannotApplySlotPropertyToFrame.

---

### boundVariables?: { readonly [field in [VariableBindableNodeField](VariableBindableNodeField.md)]?: [VariableAlias](VariableAlias.md)} & { readonly [field in [VariableBindableTextField](VariableBindableTextField.md)]?: [VariableAlias](VariableAlias.md)[]} & { fills: [VariableAlias](VariableAlias.md)[]; strokes: [VariableAlias](VariableAlias.md)[]; effects: [VariableAlias](VariableAlias.md)[]; layoutGrids: [VariableAlias](VariableAlias.md)[]; componentProperties: { [propertyName: string]: [VariableAlias](VariableAlias.md) }; textRangeFills: [VariableAlias](VariableAlias.md)[] } [readonly]

The variables bound to a particular field on this node. Please see the [Working with Variables](../working-with-variables.md) guide for how to get and set variable bindings.

---

### setBoundVariable(field: [VariableBindableNodeField](VariableBindableNodeField.md) | [VariableBindableTextField](VariableBindableTextField.md), variable: [Variable](Variable.md) | null): void

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](../working-with-variables.md) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

[View more →](properties/nodes-setboundvariable.md)

---

### [inferredVariables](properties/nodes-inferredvariables.md)?: { readonly [field in [VariableBindableNodeField](VariableBindableNodeField.md)]?: [VariableAlias](VariableAlias.md)[]} & { fills: [VariableAlias](VariableAlias.md)[][]; strokes: [VariableAlias](VariableAlias.md)[][] } [readonly]

An object, keyed by field, returning any variables that match the raw value of that field for the mode of the node (or the default variable value if no mode is set)

[View more →](properties/nodes-inferredvariables.md)

---

### [resolvedVariableModes](properties/nodes-resolvedvariablemodes.md): { [collectionId: string]: string }

The resolved mode for this node for each variable collection in this file.

[View more →](properties/nodes-resolvedvariablemodes.md)

---

### explicitVariableModes: { [collectionId: string]: string }

The explicitly set modes for this node.
For `SceneNodes`, represents a subset of [`resolvedVariableModes`](properties/nodes-resolvedvariablemodes.md).
Note that this does not include [workspace and team-default modes](https://help.figma.com/hc/en-us/articles/12611253730071).

---

### clearExplicitVariableModeForCollection(collection: [VariableCollection](VariableCollection.md)): void

Clears an explicit mode for the given collection on this node

[View more →](properties/ExplicitVariableModesMixin-clearexplicitvariablemodeforcollection.md)

---

### setExplicitVariableModeForCollection(collection: [VariableCollection](VariableCollection.md), modeId: string): void

Sets an explicit mode for the given collection on this node

[View more →](properties/ExplicitVariableModesMixin-setexplicitvariablemodeforcollection.md)

---

## Export-related properties[​](#export-related-properties "Direct link to Export-related properties")

### exportSettings: ReadonlyArray<[ExportSettings](ExportSettings.md)>

List of export settings stored on the node. For help on how to change this value, see [Editing Properties](../editing-properties.md).

---

### exportAsync(settings?: [ExportSettings](ExportSettings.md)): Promise<Uint8Array>

### exportAsync(settings: [ExportSettingsSVGString](ExportSettings.md#export-settings-svgstring)): Promise<string>

### exportAsync(settings: [ExportSettingsREST](ExportSettings.md#export-settings-rest)): Promise<Object>

Exports the node as an encoded image.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-exportasync.md)

---

## Children-related properties[​](#children-related-properties "Direct link to Children-related properties")

### [children](properties/nodes-children.md): ReadonlyArray<[SceneNode](nodes.md#scene-node)> [readonly]

The list of children, sorted back-to-front. That is, the first child in the array is the bottommost layer on the screen, and the last child in the array is the topmost layer.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this property.

[View more →](properties/nodes-children.md)

---

### [appendChild](properties/nodes-appendchild.md)(child: [SceneNode](nodes.md#scene-node)): void

Adds a new child to the end of the [`children`](properties/nodes-children.md) array. That is, visually on top of all other children.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-appendchild.md)

---

### [insertChild](properties/nodes-insertchild.md)(index: number, child: [SceneNode](nodes.md#scene-node)): void

Adds a new child at the specified index in the [`children`](properties/nodes-children.md) array.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-insertchild.md)

---

### [findChildren](properties/nodes-findchildren.md)(callback?: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node)[]

Searches the immediate children of this node (i.e. not including the children's children). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findchildren.md)

---

### [findChild](properties/nodes-findchild.md)(callback: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node) | null

Searches the immediate children of this node (i.e. not including the children's children). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findchild.md)

---

### [findAll](properties/nodes-findall.md)(callback?: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node)[]

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findall.md)

---

### [findOne](properties/nodes-findone.md)(callback: (node: [SceneNode](nodes.md#scene-node)) => boolean): [SceneNode](nodes.md#scene-node) | null

Searches this entire subtree (this node's children, its children's children, etc). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findone.md)

---

### [findAllWithCriteria](properties/nodes-findallwithcriteria.md)<T extends NodeType[]>(criteria: [FindAllCriteria](FindAllCriteria.md)<T>): Array<{ type: T[number] } & [SceneNode](nodes.md#scene-node)>

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes that satisfy all of specified criteria.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findallwithcriteria.md)

---

### [findWidgetNodesByWidgetId](properties/nodes-findwidgetnodesbywidgetid.md)(widgetId: string): Array<[WidgetNode](WidgetNode.md)>

Searches this entire subtree (this node's children, its children's children, etc). Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](PageNode.md), you must first call [`loadAsync`](PageNode.md#loadasync) to access this function.

[View more →](properties/nodes-findwidgetnodesbywidgetid.md)

---

## Geometry-related properties[​](#geometry-related-properties "Direct link to Geometry-related properties")

### [fills](properties/nodes-fills.md): ReadonlyArray<[Paint](Paint.md)> | [figma.mixed](properties/figma-mixed.md)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](../editing-properties.md).

[View more →](properties/nodes-fills.md)

---

### [fillStyleId](properties/nodes-fillstyleid.md): string | [figma.mixed](properties/figma-mixed.md)

The id of the [`PaintStyle`](PaintStyle.md) object that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](properties/nodes-fillstyleid.md)

---

### setFillStyleIdAsync(styleId: string): Promise<void>

Sets the [`PaintStyle`](PaintStyle.md) that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

---

### setFillsAsync(paints: ReadonlyArray<[Paint](Paint.md)>): Promise<void>

Sets the fills of the node asynchronously. This is the only way to set pattern fills on a node, since we need to ensure that the source node of the pattern is loaded first. See [Adding Pattern Fills and Strokes](../adding-pattern-fills-and-strokes.md) for more information.

---

## Lock aspect ratio properties[​](#lock-aspect-ratio-properties "Direct link to Lock aspect ratio properties")

### [targetAspectRatio](properties/nodes-targetaspectratio.md): [Vector](Vector.md) | null [readonly]

When toggled, causes the layer to keep its proportions when the user resizes it via auto layout, constraints, the properties panel, or on-canvas.
If not set, the node does NOT resize toward a specific targetAspectRatio.

[View more →](properties/nodes-targetaspectratio.md)

---

### lockAspectRatio(): void

Locks the node's `targetAspectRatio` to the current ratio of its width and height.

---

### unlockAspectRatio(): void

Unlocks the node's `targetAspectRatio`.

---

### [resizeWithoutConstraints](properties/nodes-resizewithoutconstraints.md)(width: number, height: number): void

Resizes the node. Children of the node are never resized, even if those children have constraints. If the parent has auto-layout, causes the parent to be resized (this constraint cannot be ignored).

[View more →](properties/nodes-resizewithoutconstraints.md)

---

[Previous

RemovedNode](RemovedNode.md)[Next

resizeWithoutConstraints](properties/SectionNode-resizewithoutconstraints.md)

- [Section properties](#section-properties)
- [Base node properties](#base-node-properties)
- [Plugin data properties](#plugin-data-properties)
- [Dev resource properties](#dev-resource-properties)
- [Layout-related properties](#layout-related-properties)
- [Scene node properties](#scene-node-properties)
- [Export-related properties](#export-related-properties)
- [Children-related properties](#children-related-properties)
- [Geometry-related properties](#geometry-related-properties)
- [Lock aspect ratio properties](#lock-aspect-ratio-properties)
