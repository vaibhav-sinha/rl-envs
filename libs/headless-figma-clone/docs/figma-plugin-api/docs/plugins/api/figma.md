<!-- source: https://developers.figma.com/docs/plugins/api/figma -->

- Plugins
- [Global Objects](global-objects.md)
- figma

On this page

These are methods and properties available on the `figma` global object.

## General[​](#general "Direct link to General")

### apiVersion: '1.0.0' [readonly]

The version of the Figma API this plugin is running on, as defined in your `manifest.json` in the `"api"` field.

---

### fileKey: string | undefined [readonly]

The file key of the current file this plugin is running on.
**Only [private plugins](https://help.figma.com/hc/en-us/articles/4404228629655-Create-private-organization-plugins) and Figma-owned resources (such as the Jira and Asana widgets) have access to this.**
To enable this behavior, you need to specify `enablePrivatePluginApi` in your `manifest.json`.

---

### command: string [readonly]

The currently executing command from the `manifest.json` file. It is the command string in the `ManifestMenuItem` (more details in the [manifest guide](../manifest.md)). If the plugin does not have any menu item, this property is undefined.

---

### pluginId?: string [readonly]

The value specified in the `manifest.json` "id" field. This only exists for Plugins.

---

### widgetId?: string [readonly]

Similar to `figma.pluginId` but for widgets. The value specified in the `manifest.json` "id" field. This only exists for Widgets.

---

### editorType: 'figma' | 'figjam' | 'dev' | 'slides' | 'buzz' [readonly]

The current editor type this plugin is running in. See also [Setting editor type](../setting-editor-type.md).

---

### [mode](properties/figma-mode.md): 'default' | 'textreview' | 'inspect' | 'codegen' | 'linkpreview' | 'auth' [readonly]

Return the context the plugin is current running in.

- `default` - The plugin is running as a normal plugin.
- `textreview` - The plugin is running to provide text review functionality.
- `inspect` - The plugin is running in the Inspect panel in Dev Mode.
- `codegen` - The plugin is running in the Code section of the Inspect panel in Dev Mode.
- `linkpreview` - The plugin is generating a link preview for a [Dev resource](https://help.figma.com/hc/en-us/articles/15023124644247#Add_external_links_and_resources_for_developers) in Dev Mode.
- `auth` - The plugin is running to authenticate a user in Dev Mode.

caution

The `linkpreview` and `auth` modes are only available to partner and Figma-owned plugins.

[View more →](properties/figma-mode.md)

---

### [skipInvisibleInstanceChildren](properties/figma-skipinvisibleinstancechildren.md): boolean

When enabled, causes all node properties and methods to skip over invisible nodes (and their descendants) inside [`instances`](InstanceNode.md).
This makes operations like document traversal much faster.

info

Defaults to true in Figma Dev Mode and false in Figma and FigJam

[View more →](properties/figma-skipinvisibleinstancechildren.md)

---

### currentPage: [PageNode](PageNode.md)

The page that the user currently viewing. You can set this value to a [`PageNode`](PageNode.md) to switch pages.

- If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use [`figma.setCurrentPageAsync`](figma.md#setcurrentpageasync) to update the value.

---

### setCurrentPageAsync(page: [PageNode](PageNode.md)): Promise<void>

Switch the active page to the specified [`PageNode`](PageNode.md).

---

### root: [DocumentNode](DocumentNode.md) [readonly]

The root of the entire Figma document. This node is used to access other pages. Each child is a [`PageNode`](PageNode.md).

---

### [showUI](properties/figma-showui.md)(html: string, options?: [ShowUIOptions](properties/figma-showui.md#show-uioptions)): void

Enables you to render UI to interact with the user, or simply to access browser APIs. This function creates a modal dialog with an `<iframe>` containing the HTML markup in the `html` argument.

[View more →](properties/figma-showui.md)

---

### ui: [UIAPI](figma-ui.md#uiapi) [readonly]

This property contains methods used to modify and communicate with the UI created via `figma.showUI(...)`.

Read more in the [UI section](figma-ui.md).

---

### util: [UtilAPI](figma-util.md#util-api) [readonly]

This property contains convenience functions for common operations.

Read more in the [util section](figma-util.md).

---

### constants: [ConstantsAPI](figma-constants.md#constants-api) [readonly]

This property contains constants that can be accessed by the plugin API.

Read more in the [constants section](figma-constants.md).

---

### timer?: [TimerAPI](figma-timer.md#timer-api) [readonly]

info

This API is only available in FigJam

This property contains methods used to read, set, and modify the built in FigJam timer.

Read more in the [timer section](figma-timer.md).

---

### viewport: [ViewportAPI](figma-viewport.md#viewport-api) [readonly]

This property contains methods used to read and set the viewport, the user-visible area of the current page.

Read more in the [viewport section](figma-viewport.md).

---

### clientStorage: [ClientStorageAPI](figma-clientStorage.md#client-storage-api) [readonly]

This property contains methods to store persistent data on the user's local machine.

Read more in the [client storage section](figma-clientStorage.md).

---

### parameters: [ParametersAPI](figma-parameters.md#parameters-api) [readonly]

This property contains methods to handle user inputs when a plugin is launched in query mode. See [Accepting Parameters as Input](../plugin-parameters.md) for more details.

---

### payments?: [PaymentsAPI](figma-payments.md#payments-api) [readonly]

info

`payments` must be specified in the permissions array in `manifest.json` to access this property.

This property contains methods for plugins that require payment.

---

### currentUser: [User](User.md) | null [readonly]

info

`currentuser` must be specified in the permissions array in `manifest.json` to access this property.

This property contains details about the current user.

---

### activeUsers: [ActiveUser](ActiveUser.md)[] [readonly]

info

This API is only available in FigJam.

`activeusers` must be specified in the permissions array in `manifest.json` to access this property.

This property contains details about the active users in the file. `figma.activeUsers[0]` will match `figma.currentUser` for the `id`, `name`, `photoUrl`, `color`, and `sessionId` properties.

---

### textreview?: [TextReviewAPI](figma-textreview.md#text-review-api) [readonly]

info

`textreview` must be specified in the capabilities array in `manifest.json` to access this property.

This property contains methods that enable text review features in your plugin.

---

### variables: [VariablesAPI](figma-variables.md#variables-api) [readonly]

This property contains methods to work with Variables and Variable Collections within Figma.

---

### teamLibrary: [TeamLibraryAPI](figma-teamlibrary.md#team-library-api) [readonly]

This property contains methods to work with assets residing in a team library.

---

### annotations: [AnnotationsAPI](figma-annotations.md#annotations-api) [readonly]

This property contains methods to work with annotations.

---

### buzz: [BuzzAPI](figma-buzz.md#buzz-api) [readonly]

This API is only available in Buzz.

This property contains methods to work in Buzz.

---

### [closePlugin](properties/figma-closeplugin.md)(message?: string): void

Closes the plugin. You should always call this function once your plugin is done running. When called, any UI that's open will be closed and any `setTimeout` or `setInterval` timers will be cancelled.

[View more →](properties/figma-closeplugin.md)

---

### [on](properties/figma-on.md)(type: [ArgFreeEventType](properties/figma-on.md#arg-free-event-type), callback: () => void): void

### [on](properties/figma-on.md)(type: 'run', callback: (event: [RunEvent](RunEvent.md)) => void): void

### [on](properties/figma-on.md)(type: 'drop', callback: (event: [DropEvent](DropEvent.md)) => boolean): void

### [on](properties/figma-on.md)(type: 'documentchange', callback: (event: [DocumentChangeEvent](DocumentChangeEvent.md)) => void): void

### [on](properties/figma-on.md)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](SlidesViewChangeEvent.md)) => void): void

### [on](properties/figma-on.md)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](CanvasViewChangeEvent.md)) => void): void

### [on](properties/figma-on.md)(type: 'textreview', callback: (event: [TextReviewEvent](TextReviewEvent.md)) => Promise<[TextReviewRange](TextReviewRange.md)[]> | [TextReviewRange](TextReviewRange.md)[]): void

### [on](properties/figma-on.md)(type: 'stylechange', callback: (event: [StyleChangeEvent](StyleChangeEvent.md)) => void): void

Registers an callback that will be called when an event happens in the editor. Current supported events are:

- The selection on the current page changed.
- The current page changed.
- The document has changed.
- An object from outside Figma is dropped onto the canvas
- The plugin has started running.
- The plugin closed.
- The plugin has started running.
- The timer has started running.
- The timer has paused.
- The timer has stopped.
- The timer is done.
- The timer has resumed.

[View more →](properties/figma-on.md)

---

### once(type: [ArgFreeEventType](properties/figma-on.md#arg-free-event-type), callback: () => void): void

### once(type: 'run', callback: (event: [RunEvent](RunEvent.md)) => void): void

### once(type: 'drop', callback: (event: [DropEvent](DropEvent.md)) => boolean): void

### once(type: 'documentchange', callback: (event: [DocumentChangeEvent](DocumentChangeEvent.md)) => void): void

### once(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](SlidesViewChangeEvent.md)) => void): void

### once(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](CanvasViewChangeEvent.md)) => void): void

### once(type: 'textreview', callback: (event: [TextReviewEvent](TextReviewEvent.md)) => Promise<[TextReviewRange](TextReviewRange.md)[]> | [TextReviewRange](TextReviewRange.md)[]): void

### once(type: 'stylechange', callback: (event: [StyleChangeEvent](StyleChangeEvent.md)) => void): void

Same as `figma.on`, but the callback will only be called once, the first time the specified event happens.

---

### [off](properties/figma-off.md)(type: [ArgFreeEventType](properties/figma-on.md#arg-free-event-type), callback: () => void): void

### [off](properties/figma-off.md)(type: 'run', callback: (event: [RunEvent](RunEvent.md)) => void): void

### [off](properties/figma-off.md)(type: 'drop', callback: (event: [DropEvent](DropEvent.md)) => boolean): void

### [off](properties/figma-off.md)(type: 'documentchange', callback: (event: [DocumentChangeEvent](DocumentChangeEvent.md)) => void): void

### [off](properties/figma-off.md)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](SlidesViewChangeEvent.md)) => void): void

### [off](properties/figma-off.md)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](CanvasViewChangeEvent.md)) => void): void

### [off](properties/figma-off.md)(type: 'textreview', callback: (event: [TextReviewEvent](TextReviewEvent.md)) => Promise<[TextReviewRange](TextReviewRange.md)[]> | [TextReviewRange](TextReviewRange.md)[]): void

### [off](properties/figma-off.md)(type: 'stylechange', callback: (event: [StyleChangeEvent](StyleChangeEvent.md)) => void): void

Removes a callback added with `figma.on` or `figma.once`.

[View more →](properties/figma-off.md)

---

### [notify](properties/figma-notify.md)(message: string, options?: [NotificationOptions](properties/figma-notify.md#notification-options)): [NotificationHandler](properties/figma-notify.md#notification-handler)

Shows a notification on the bottom of the screen.

[View more →](properties/figma-notify.md)

---

### [commitUndo](properties/figma-commitundo.md)(): void

Commits actions to undo history. This does not trigger an undo.

[View more →](properties/figma-commitundo.md)

---

### triggerUndo(): void

Triggers an undo action. Reverts to the last `commitUndo()` state.

---

### [saveVersionHistoryAsync](properties/figma-saveversionhistoryasync.md)(title: string, description?: string): Promise<[VersionHistoryResult](properties/figma-saveversionhistoryasync.md#version-history-result)>

Saves a new version of the file and adds it to the version history of the file. Returns the new version id.

[View more →](properties/figma-saveversionhistoryasync.md)

---

### [openExternal](properties/figma-openexternal.md)(url: string): void

Open a url in a new tab.

[View more →](properties/figma-openexternal.md)

---

## Nodes[​](#nodes "Direct link to Nodes")

This section contains to get or create new nodes.

### getNodeByIdAsync(id: string): Promise<[BaseNode](nodes.md#base-node) | null>

Finds a node by its id in the current document. Every node has an `id` property, which is unique within the document. If the id is invalid, or the node cannot be found (e.g. removed), returns a promise containing null.

---

### getNodeById(id: string): [BaseNode](nodes.md#base-node) | null

**DEPRECATED:** Use [`figma.getNodeByIdAsync`](figma.md#getnodebyidasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a node by its id in the current document. Every node has an `id` property, which is unique within the document. If the id is invalid, or the node cannot be found (e.g. removed), returns null.

---

### [createRectangle](properties/figma-createrectangle.md)(): [RectangleNode](RectangleNode.md)

Creates a new rectangle. The behavior is similar to using the `R` shortcut followed by a click.

[View more →](properties/figma-createrectangle.md)

---

### [createLine](properties/figma-createline.md)(): [LineNode](LineNode.md)

Creates a new line.

[View more →](properties/figma-createline.md)

---

### [createEllipse](properties/figma-createellipse.md)(): [EllipseNode](EllipseNode.md)

Creates a new ellipse. The behavior is similar to using the `O` shortcut followed by a click.

[View more →](properties/figma-createellipse.md)

---

### [createPolygon](properties/figma-createpolygon.md)(): [PolygonNode](PolygonNode.md)

Creates a new polygon (defaults to a triangle).

[View more →](properties/figma-createpolygon.md)

---

### [createStar](properties/figma-createstar.md)(): [StarNode](StarNode.md)

Creates a new star.

[View more →](properties/figma-createstar.md)

---

### [createVector](properties/figma-createvector.md)(): [VectorNode](VectorNode.md)

Creates a new, empty vector network with no vertices.

[View more →](properties/figma-createvector.md)

---

### [createText](properties/figma-createtext.md)(): [TextNode](TextNode.md)

Creates a new, empty text node.

[View more →](properties/figma-createtext.md)

---

### [createTextPath](properties/figma-createtextpath.md)(node: [VectorNode](VectorNode.md), startSegment: number, startPosition: number): [TextPathNode](TextPathNode.md)

Creates a new text on a path node from an existing vector node.

[View more →](properties/figma-createtextpath.md)

---

### [createFrame](properties/figma-createframe.md)(): [FrameNode](FrameNode.md)

Creates a new frame. The behavior is similar to using the `F` shortcut followed by a click.

[View more →](properties/figma-createframe.md)

---

### [createAutoLayout](properties/figma-createautolayout.md)(direction?: 'HORIZONTAL' | 'VERTICAL'): [FrameNode](FrameNode.md)

info

This API is only available via `use_figma` in the MCP server

Creates a new frame with auto layout already enabled. Both axes default to hug content
(`primaryAxisSizingMode = "AUTO"`, `counterAxisSizingMode = "AUTO"`), so children can
immediately use `layoutSizingHorizontal/Vertical = "FILL"` after being appended.

[View more →](properties/figma-createautolayout.md)

---

### [createComponent](properties/figma-createcomponent.md)(): [ComponentNode](ComponentNode.md)

info

This API is only available in Figma Design

Creates a new, empty component.

[View more →](properties/figma-createcomponent.md)

---

### [createComponentFromNode](properties/figma-createcomponentfromnode.md)(node: [SceneNode](nodes.md#scene-node)): [ComponentNode](ComponentNode.md)

info

This API is only available in Figma Design

Creates a component from an existing node, preserving all of its properties and children. The behavior is similar to using the **Create component** button in the toolbar.

[View more →](properties/figma-createcomponentfromnode.md)

---

### [createBooleanOperation](properties/figma-createbooleanoperation.md)(): [BooleanOperationNode](BooleanOperationNode.md)

**DEPRECATED:** Use [`figma.union`](figma.md#union), [`figma.subtract`](figma.md#subtract), [`figma.intersect`](figma.md#intersect), [`figma.exclude`](figma.md#exclude) instead.

[View more →](properties/figma-createbooleanoperation.md)

---

### [createPage](properties/figma-createpage.md)(): [PageNode](PageNode.md)

info

This API is only available in Figma Design

Creates a new page, appended to the document's list of children.

[View more →](properties/figma-createpage.md)

---

### [createPageDivider](properties/figma-createpagedivider.md)(dividerName?: string): [PageNode](PageNode.md)

Creates a new page divider, appended to the document's list of children. A page divider is a [`PageNode`](PageNode.md) with `isPageDivider` true.

[View more →](properties/figma-createpagedivider.md)

---

### [createSlice](properties/figma-createslice.md)(): [SliceNode](SliceNode.md)

Creates a new slice object.

[View more →](properties/figma-createslice.md)

---

### [createSlide](properties/figma-createslide.md)(row?: number, col?: number): [SlideNode](SlideNode.md)

info

This API is only available in Figma Slides

[View more →](properties/figma-createslide.md)

---

### [createSlideRow](properties/figma-createsliderow.md)(row?: number): [SlideRowNode](SlideRowNode.md)

info

This API is only available in Figma Slides

Creates a new Slide Row, which automatically gets appended to the Slide Grid.

[View more →](properties/figma-createsliderow.md)

---

### [createSticky](properties/figma-createsticky.md)(): [StickyNode](StickyNode.md)

info

This API is only available in FigJam

Creates a new sticky. The behavior is similar to using the `S` shortcut followed by a click.

[View more →](properties/figma-createsticky.md)

---

### [createShapeWithText](properties/figma-createshapewithtext.md)(): [ShapeWithTextNode](ShapeWithTextNode.md)

info

This API is only available in FigJam

Creates a new shape with text.

[View more →](properties/figma-createshapewithtext.md)

---

### [createConnector](properties/figma-createconnector.md)(): [ConnectorNode](ConnectorNode.md)

info

This API is only available in FigJam

Creates a new connector. The behavior is similar to using the `Shift-C` shortcut followed by a click.

[View more →](properties/figma-createconnector.md)

---

### createCodeBlock(): [CodeBlockNode](CodeBlockNode.md)

info

This API is only available in FigJam

Creates a new code block.

---

### createSection(): [SectionNode](SectionNode.md)

Creates a new section

---

### [createTable](properties/figma-createtable.md)(numRows?: number, numColumns?: number): [TableNode](TableNode.md)

info

This API is only available in FigJam

Creates a new table.

[View more →](properties/figma-createtable.md)

---

### [createLinkPreviewAsync](properties/figma-createlinkpreviewasync.md)(url: string): Promise<[EmbedNode](EmbedNode.md) | [LinkUnfurlNode](LinkUnfurlNode.md)>

info

This API is only available in FigJam.

Resolves link metadata from a URL, and inserts either an embed or a unfurled preview of the link into the document
An embed will be inserted if the URL is a valid OEmbed provider (has a `<link type="application/json+oembed" ... />` tag). The returned `<iframe>` source will be converted into an EmbedNode.

Otherwise, the title, description, thumbnail, and favicon will be parsed from the HTML markup of the URL using standard `og` or `twitter` meta tags. This information will be converted into a LinkUnfurlNode.

[View more →](properties/figma-createlinkpreviewasync.md)

---

### [createGif](properties/figma-creategif.md)(hash: string): [MediaNode](MediaNode.md)

info

This API is only available in FigJam

Creates a new GIF with the given `Image` hash.

[View more →](properties/figma-creategif.md)

---

### createNodeFromSvg(svg: string): [FrameNode](FrameNode.md)

Creates a new node from an SVG string. This is equivalent to the SVG import feature in the editor. See the [official documentation on SVG paths](https://www.w3.org/TR/SVG/paths.html) for more details.

---

### [createNodeFromJSXAsync](properties/figma-createnodefromjsxasync.md)(jsx: any): Promise<[SceneNode](nodes.md#scene-node)>

This API creates a new node using the JSX API used by widgets.

[View more →](properties/figma-createnodefromjsxasync.md)

---

### [combineAsVariants](properties/figma-combineasvariants.md)(nodes: ReadonlyArray<[ComponentNode](ComponentNode.md)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [ComponentSetNode](ComponentSetNode.md)

info

This API is only available in Figma Design

Creates a new [`ComponentSetNode`](ComponentSetNode.md) by combining all the nodes in `nodes`, which should all have type [`ComponentNode`](ComponentNode.md).

[View more →](properties/figma-combineasvariants.md)

---

### [group](properties/figma-group.md)(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [GroupNode](GroupNode.md)

Creates new group containing all the nodes in `nodes`. There is no `createGroup` function -- use this instead. Group nodes have many quirks, like auto-resizing, that you can read about in the [`FrameNode`](FrameNode.md) section.

[View more →](properties/figma-group.md)

---

### union(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [BooleanOperationNode](BooleanOperationNode.md)

Creates a new [`BooleanOperationNode`](BooleanOperationNode.md) using the UNION operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.group`](properties/figma-group.md).

---

### subtract(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [BooleanOperationNode](BooleanOperationNode.md)

Creates a new [`BooleanOperationNode`](BooleanOperationNode.md) using the SUBTRACT operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.subtract`](figma.md#subtract).

---

### intersect(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [BooleanOperationNode](BooleanOperationNode.md)

Creates a new [`BooleanOperationNode`](BooleanOperationNode.md) using the INTERSECT operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.intersect`](figma.md#intersect).

---

### exclude(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [BooleanOperationNode](BooleanOperationNode.md)

Creates a new [`BooleanOperationNode`](BooleanOperationNode.md) using the EXCLUDE operation using the contents of `nodes`. The arguments to `union` are the same as in [`figma.exclude`](figma.md#exclude).

---

### [flatten](properties/figma-flatten.md)(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>, parent?: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index?: number): [VectorNode](VectorNode.md)

Flattens every node in nodes into a new vector network.

[View more →](properties/figma-flatten.md)

---

### [ungroup](properties/figma-ungroup.md)(node: [SceneNode](nodes.md#scene-node) & [ChildrenMixin](node-properties.md#children-mixin)): Array<[SceneNode](nodes.md#scene-node)>

Ungroups the given `node`, moving all of `node`'s children into `node`'s parent and removing `node`. Returns an array of nodes that were children of `node`.

[View more →](properties/figma-ungroup.md)

---

### transformGroup(nodes: ReadonlyArray<[SceneNode](nodes.md#scene-node)>, parent: [BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin), index: number, modifiers: [TransformModifier](TransformModifier.md)[]): [TransformGroupNode](TransformGroupNode.md)

Creates a new [`TransformGroupNode`](TransformGroupNode.md) containing all the nodes in `nodes`, applying the transformations specified in `modifiers` to each child node.

[View more →](properties/figma-transformgroup.md)

---

## Dev Mode[​](#dev-mode "Direct link to Dev Mode")

These APIs integrate your plugin with Figma's Dev Mode. Use the APIs to generate code and interfaces in Dev Mode.

### codegen: [CodegenAPI](figma-codegen.md#codegen-api) [readonly]

This property contains methods used to integrate with the Dev Mode codegen functionality.

Read more in the [codegen section](figma-codegen.md).

---

### vscode?: VSCodeAPI [readonly]

This property contains methods used to integrate with the Figma for VS Code extension. If `undefined`, the plugin is not running in VS Code.

Read more in [Dev Mode plugins in Visual Studio Code](../working-in-dev-mode.md#dev-mode-plugins-in-visual-studio-code)

---

### devResources?: DevResourcesAPI [readonly]

caution

This is a private API only available to [Figma partners](https://www.figma.com/partners/)

---

### getSelectionColors(): null | { paints: [Paint](Paint.md)[]; styles: [PaintStyle](PaintStyle.md)[] }

Returns all of the colors in a user’s current selection. This
returns the same values that are shown in Figma's native selection
colors feature. This can be useful for getting a list of colors and
styles in the current selection and converting them into a different
code format (like CSS variables for a user’s codebase).

If there are colors in a selection it will return an object with a
`paints` property, which is an array of `Paint[]`, and a `styles`
property, which is an array of `PaintStyle[]`.

info

`getSelectionColors()` returns `null` if there is no selection, or
if there are too many colors in the selection (>1000).

---

## Slides[​](#slides "Direct link to Slides")

### [getSlideGrid](properties/figma-getslidegrid.md)(): Array<Array<[SlideNode](SlideNode.md)>>

**DEPRECATED:** Use [`figma.getCanvasGrid`](properties/figma-getcanvasgrid.md) instead.

info

This API is only available in Figma Slides

[View more →](properties/figma-getslidegrid.md)

---

### [setSlideGrid](properties/figma-setslidegrid.md)(slideGrid: Array<Array<[SlideNode](SlideNode.md)>>): void

**DEPRECATED:** Use [`figma.setCanvasGrid`](properties/figma-setcanvasgrid.md) instead.

info

This API is only available in Figma Slides

[View more →](properties/figma-setslidegrid.md)

---

## Canvas Grid[​](#canvas-grid "Direct link to Canvas Grid")

### [getCanvasGrid](properties/figma-getcanvasgrid.md)(): Array<Array<[SceneNode](nodes.md#scene-node)>>

Gets the current canvas grid layout as a 2D array of nodes.

info

This API is only available in Figma Slides and Figma Buzz

[View more →](properties/figma-getcanvasgrid.md)

---

### [setCanvasGrid](properties/figma-setcanvasgrid.md)(canvasGrid: Array<Array<[SceneNode](nodes.md#scene-node)>>): void

Sets the canvas grid layout, reorganizing nodes in the canvas.

info

This API is only available in Figma Slides and Figma Buzz

[View more →](properties/figma-setcanvasgrid.md)

---

### [createCanvasRow](properties/figma-createcanvasrow.md)(rowIndex?: number): [SceneNode](nodes.md#scene-node)

Creates a new row in the canvas grid at the specified index.

info

This API is only available in Figma Slides and Figma Buzz

[View more →](properties/figma-createcanvasrow.md)

---

### [moveNodesToCoord](properties/figma-movenodestocoord.md)(nodeIds: string[], rowIndex?: number, columnIndex?: number): void

Moves the specified nodes to a specific coordinate in the canvas grid.

info

This API is only available in Figma Slides and Figma Buzz

This function allows precise positioning of multiple nodes within the
canvas grid system used in Slides and Buzz.

[View more →](properties/figma-movenodestocoord.md)

---

## Styles[​](#styles "Direct link to Styles")

These are APIs available to create new styles and retrieve existing ones in the current document. The newly created styles are local to the current document and do not contain default properties (except for TextStyle).

### getStyleByIdAsync(id: string): Promise<[BaseStyle](BaseStyle.md) | null>

Finds a style by its id in the current document. If not found, returns a promise containing null.

---

### getStyleById(id: string): [BaseStyle](BaseStyle.md) | null

**DEPRECATED:** Use [`figma.getStyleByIdAsync`](figma.md#getstylebyidasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a style by its id in the current document. If not found, returns null.

---

### createPaintStyle(): [PaintStyle](PaintStyle.md)

info

This API is only available in Figma Design

Creates a new Paint style. This might be referred to as a Color style, or Fill style more colloquially. However, since this type of style may contain images, and may be used for backgrounds, strokes, and fills, it is called a Paint.

---

### createTextStyle(): [TextStyle](TextStyle.md)

info

This API is only available in Figma Design

Creates a new Text style. By default, the text style has the Figma default text properties (font family Inter Regular, font size 12).

---

### createEffectStyle(): [EffectStyle](EffectStyle.md)

info

This API is only available in Figma Design

Creates a new Effect style.

---

### createGridStyle(): [GridStyle](GridStyle.md)

info

This API is only available in Figma Design

Creates a new Grid style.

---

The APIs below allow access to local styles, which are returned in the same order as displayed in the UI. Only local styles are returned, not the ones from the team library.

### getLocalPaintStylesAsync(): Promise<[PaintStyle](PaintStyle.md)[]>

Returns the list of local paint styles.

---

### getLocalPaintStyles(): [PaintStyle](PaintStyle.md)[]

**DEPRECATED:** Use [`figma.getLocalPaintStylesAsync`](figma.md#getlocalpaintstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local paint styles.

---

### getLocalTextStylesAsync(): Promise<[TextStyle](TextStyle.md)[]>

Returns the list of local text styles.

---

### getLocalTextStyles(): [TextStyle](TextStyle.md)[]

**DEPRECATED:** Use [`figma.getLocalTextStylesAsync`](figma.md#getlocaltextstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local text styles.

---

### getLocalEffectStylesAsync(): Promise<[EffectStyle](EffectStyle.md)[]>

Returns the list of local effect styles.

---

### getLocalEffectStyles(): [EffectStyle](EffectStyle.md)[]

**DEPRECATED:** Use [`figma.getLocalEffectStylesAsync`](figma.md#getlocaleffectstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local effect styles.

---

### getLocalGridStylesAsync(): Promise<[GridStyle](GridStyle.md)[]>

Returns the list of local grid styles.

---

### getLocalGridStyles(): [GridStyle](GridStyle.md)[]

**DEPRECATED:** Use [`figma.getLocalGridStylesAsync`](figma.md#getlocalgridstylesasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns the list of local grid styles.

---

### moveLocalPaintStyleAfter(targetNode: [PaintStyle](PaintStyle.md), reference: [PaintStyle](PaintStyle.md) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local paint styles.

---

### moveLocalTextStyleAfter(targetNode: [TextStyle](TextStyle.md), reference: [TextStyle](TextStyle.md) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local text styles.

---

### moveLocalEffectStyleAfter(targetNode: [EffectStyle](EffectStyle.md), reference: [EffectStyle](EffectStyle.md) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local effect styles.

---

### moveLocalGridStyleAfter(targetNode: [GridStyle](GridStyle.md), reference: [GridStyle](GridStyle.md) | null): void

info

This API is only available in Figma Design

Reorders a target node after the specified reference node (if provided) or to be first if reference is null. The target and reference nodes must live in the same folder. The target and reference nodes must be local grid styles.

---

### moveLocalPaintFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain paint styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](BaseStyle.md) section for more info.

---

### moveLocalTextFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain text styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](BaseStyle.md) section for more info.

---

### moveLocalEffectFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain effect styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](BaseStyle.md) section for more info.

---

### moveLocalGridFolderAfter(targetFolder: string, reference: string | null): void

info

This API is only available in Figma Design

Reorders a target folder after the specified reference folder (if provided) or to be first in the parent folder if reference is null. The target and reference folders must have the same parent folder. The target and reference folders must contain grid styles. When referring to nested folders, the full delimited folder name must be used. See the [`BaseStyle`](BaseStyle.md) section for more info.

---

## Team Library[​](#team-library "Direct link to Team Library")

These APIs allow you to get a component, style, or variable from the team library. This requires you to have a key. You can get a key by calling `component.key` or `style.key` while a plugin is running.

### importComponentByKeyAsync(key: string): Promise<[ComponentNode](ComponentNode.md)>

Loads a component node from the team library. Promise is rejected if there is no published component with that key or if the request fails.

---

### importComponentSetByKeyAsync(key: string): Promise<[ComponentSetNode](ComponentSetNode.md)>

Loads a component set node from the team library. Promise is rejected if there is no published component set with that key or if the request fails.

---

### importStyleByKeyAsync(key: string): Promise<[BaseStyle](BaseStyle.md)>

Loads a style from the team library. Promise is rejected if there is no style with that key or if the request fails.

---

### importVariableByKeyAsync(key: string): Promise<[Variable](Variable.md)>

Loads a variable from the team library. Promise is rejected if there is
no published variable with that key or if the request fails.

[View more →](properties/figma-variables-importvariablebykeyasync.md)

---

## Other[​](#other "Direct link to Other")

### listAvailableFontsAsync(): Promise<[Font](FontName.md#font)[]>

Returns the lists of currently available fonts. This should be the same list as the one you'd see if you manually used the font picker.

---

### [loadFontAsync](properties/figma-loadfontasync.md)(fontName: [FontName](FontName.md)): Promise<void>

Makes a font available *in the plugin* for use when creating and modifying text. Calling this function is **necessary** to modify any property of a text node that may cause the rendered text to change, including `.characters`, `.fontSize`, `.fontName`, etc.

You can either pass in a hardcoded font, a font loaded via `listAvailableFontsAsync`, or the font stored on an existing text node.

Read more about how to work with fonts, when to load them, and how to load them in the [Working with Text](../working-with-text.md) page.

[View more →](properties/figma-loadfontasync.md)

---

### hasMissingFont: boolean [readonly]

Returns true if the document contains text with missing fonts.

---

### [createImage](properties/figma-createimage.md)(data: Uint8Array): [Image](Image.md)

Creates an `Image` object from the raw bytes of a file content. Note that `Image` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain images.
[Example: how to work with images](../working-with-images.md).

[View more →](properties/figma-createimage.md)

---

### [createImageAsync](properties/figma-createimageasync.md)(src: string): Promise<[Image](Image.md)>

Creates an `Image` object from a src URL. Note that `Image` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain images.

[View more →](properties/figma-createimageasync.md)

---

### getImageByHash(hash: string): [Image](Image.md) | null

This gets the corresponding `Image` object for a given image hash, which can then be used to obtain the bytes of the image. This hash is found in a node's fill property as part of the ImagePaint object. If there is no image with this hash, returns null.

---

### [createVideoAsync](properties/figma-createvideoasync.md)(data: Uint8Array): Promise<[Video](Video.md)>

Creates a `Video` object from the raw bytes of a file content. Like `Image` objects, `Video` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain videos.

[View more →](properties/figma-createvideoasync.md)

---

### [mixed](properties/figma-mixed.md): unique symbol [readonly]

This a constant value that some node properties return when they are a mix of multiple values. An example might be font size: a single text node can use multiple different font sizes for different character ranges. For those properties, you should always compare against `figma.mixed`.

[View more →](properties/figma-mixed.md)

---

### base64Encode(data: Uint8Array): string

Returns a base64-encoded string from the Uint8Array `data`.

---

### base64Decode(data: string): Uint8Array

Decodes and returns a Uint8Array from the base64-encoded string `data`.

---

### getFileThumbnailNodeAsync(): Promise<[FrameNode](FrameNode.md) | [ComponentNode](ComponentNode.md) | [ComponentSetNode](ComponentSetNode.md) | [SectionNode](SectionNode.md) | null>

Gets the node that is currently being used for file thumbnail, or null if the default thumbnail is used.

---

### getFileThumbnailNode(): [FrameNode](FrameNode.md) | [ComponentNode](ComponentNode.md) | [ComponentSetNode](ComponentSetNode.md) | [SectionNode](SectionNode.md) | null

**DEPRECATED:** Use [`figma.getFileThumbnailNodeAsync`](figma.md#getfilethumbnailnodeasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Gets the node that is currently being used for file thumbnail, or null if the default thumbnail is used.

---

### setFileThumbnailNodeAsync(node: [FrameNode](FrameNode.md) | [ComponentNode](ComponentNode.md) | [ComponentSetNode](ComponentSetNode.md) | [SectionNode](SectionNode.md) | null): Promise<void>

Set `node` to be the thumbnail for the file. If `node` is null, then use the default thumbnail.

---

### loadAllPagesAsync(): Promise<void>

Loads all pages of the document into memory. This enables the use of the following features:

- The `documentchange` event for [`figma.on`](properties/figma-on.md)
- [`findAll`](properties/DocumentNode-findall.md)
- [`findOne`](properties/DocumentNode-findone.md)
- [`findAllWithCriteria`](DocumentNode.md#findallwithcriteria)
- [`findWidgetNodesByWidgetId`](properties/DocumentNode-findwidgetnodesbywidgetid.md)

Calling this method may be slow for large documents, and should be avoided unless absolutely necessary.

This method is only necessary if the plugin manifest contains `"documentAccess": "dynamic-page"`. Without this manifest setting, the full document is loaded automatically when the plugin or widget runs.

---

### [loadBrushesAsync](properties/figma-loadbrushesasync.md)(brushType: 'STRETCH' | 'SCATTER'): Promise<void>

Makes all built-in brushes of the specified type available for use in the plugin. This function must be called before
setting the stroke of a node to a brush of the specified type.

There are two types of brushes: 'STRETCH' brushes, which stretch along the length of the stroke, and 'SCATTER' brushes, which scatter instances of the brush shape along the stroke.

[View more →](properties/figma-loadbrushesasync.md)

---

[Previous

Global Objects](global-objects.md)[Next

ui](figma-ui.md)

- [General](#general)
- [Nodes](#nodes)
- [Dev Mode](#dev-mode)
- [Slides](#slides)
- [Canvas Grid](#canvas-grid)
- [Styles](#styles)
- [Team Library](#team-library)
- [Other](#other)
