<!-- source: https://developers.figma.com/docs/plugins/api/PageNode -->

- Plugins
- [Node Types](nodes.md)
- PageNode

On this page

The page node is always a descendent of the [`DocumentNode`](DocumentNode.md). Most plugins only need to access the current page accessed via [`figma.currentPage`](figma.md#currentpage).

## Page properties[​](#page-properties "Direct link to Page properties")

### type: 'PAGE' [readonly]

The type of this node, represented by the string literal "PAGE"

---

### clone(): [PageNode](PageNode.md)

Create a clone of this page, parented under [`figma.root`](figma.md#root). Prototyping connections will be copied such that they point to their equivalent in the cloned page. Components will be cloned as instances who master is the original component.

---

### [guides](properties/PageNode-guides.md): ReadonlyArray<[Guide](Guide.md)>

The guides on this page.

[View more →](properties/PageNode-guides.md)

---

### [selection](properties/PageNode-selection.md): ReadonlyArray<[SceneNode](nodes.md#scene-node)>

The selected nodes on this page. Each page stores its own selection separately. The ordering of nodes in the selection is **unspecified**, you should not be relying on it.

[View more →](properties/PageNode-selection.md)

---

### [selectedTextRange](properties/PageNode-selectedtextrange.md): { node: [TextNode](TextNode.md); start: number; end: number } | null

The current text node being edited, if any, and the text currently being selected within that text node.

[View more →](properties/PageNode-selectedtextrange.md)

---

### [flowStartingPoints](properties/PageNode-flowstartingpoints.md): ReadonlyArray<{ nodeId: string; name: string }>

The sorted list of flow starting points used when accessing Presentation view.

[View more →](properties/PageNode-flowstartingpoints.md)

---

### backgrounds: ReadonlyArray<[Paint](Paint.md)>

The background color of the canvas (currently only supports a single solid color paint).

---

### prototypeBackgrounds: ReadonlyArray<[Paint](Paint.md)>

The background color of the prototype (currently only supports a single solid color paint).

---

### prototypeStartNode: [FrameNode](FrameNode.md) | [GroupNode](GroupNode.md) | [ComponentNode](ComponentNode.md) | [InstanceNode](InstanceNode.md) | null [readonly]

The starting point when launching a prototype. Prototypes with a starting node contain all frames reachable from that node. Prototypes without a starting node contain all frames on the current page. Note that prototypes are per-page.

---

### isPageDivider: boolean

Returns true if the node is a page divider, which is only possible when the page node is empty and has a page divider name. A page divider name consists of all asterisks, all en dashes, all em dashes, or all spaces.

---

### loadAsync(): Promise<void>

Loads the contents of the page node.

---

### [on](properties/PageNode-on.md)(type: 'nodechange', callback: (event: [NodeChangeEvent](NodeChangeEvent.md)) => void): void

Registers a callback that will be invoked when an event occurs on the page. Current supported events are:

- `"nodechange"`: Emitted when a node is added, removed, or updated.

[View more →](properties/PageNode-on.md)

---

### once(type: 'nodechange', callback: (event: [NodeChangeEvent](NodeChangeEvent.md)) => void): void

Same as [`on`](properties/PageNode-on.md), but the callback will only be called once, the first time the specified event happens.

---

### [off](properties/PageNode-off.md)(type: 'nodechange', callback: (event: [NodeChangeEvent](NodeChangeEvent.md)) => void): void

Removes a callback added with [`on`](properties/PageNode-on.md) or [`once`](PageNode.md#once).

[View more →](properties/PageNode-off.md)

---

### [focusedSlide](properties/PageNode-focusedslide.md)?: [SlideNode](SlideNode.md) | null

info

This API is only available in Figma Slides

When in single slide view, the Slide that is currently focused is accessible via this property.

[View more →](properties/PageNode-focusedslide.md)

---

### [focusedNode](properties/PageNode-focusednode.md): [SceneNode](nodes.md#scene-node) | null

info

This API is only available in Figma Slides, Figma Buzz, and Dev Mode.

For Figma Slides and Figma Buzz:
When in Asset View, this is the focused slide or asset.

For Dev Mode:
This is the node currently focused in Dev Mode focus view. This property is read-only in Dev Mode.

[View more →](properties/PageNode-focusednode.md)

---

## Measurement properties[​](#measurement-properties "Direct link to Measurement properties")

### getMeasurements(): [Measurement](Measurement.md)[]

Get all measurements in the current page.

Learn more about measurements in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935).

---

### getMeasurementsForNode(node: [SceneNode](nodes.md#scene-node)): [Measurement](Measurement.md)[]

Get all measurements pointing to a node in the current page. This includes all measurements whose start *or* end node is the node passed in.

---

### addMeasurement(start: { node: [SceneNode](nodes.md#scene-node); side: [MeasurementSide](MeasurementSide.md) }, end: { node: [SceneNode](nodes.md#scene-node); side: [MeasurementSide](MeasurementSide.md) }, options?: { offset: [MeasurementOffset](MeasurementOffset.md); freeText: string }): [Measurement](Measurement.md)

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

### editMeasurement(id: string, newValue: { offset: [MeasurementOffset](MeasurementOffset.md); freeText: string }): [Measurement](Measurement.md)

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

### deleteMeasurement(id: string): void

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

## Explicit variable modes[​](#explicit-variable-modes "Direct link to Explicit variable modes")

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

[Previous

resizeWithoutConstraints](properties/MediaNode-resizewithoutconstraints.md)[Next

guides](properties/PageNode-guides.md)

- [Page properties](#page-properties)
- [Measurement properties](#measurement-properties)
- [Base node properties](#base-node-properties)
- [Plugin data properties](#plugin-data-properties)
- [Dev resource properties](#dev-resource-properties)
- [Explicit variable modes](#explicit-variable-modes)
- [Children-related properties](#children-related-properties)
- [Export-related properties](#export-related-properties)
