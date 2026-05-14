<!-- source: https://developers.figma.com/docs/plugins/api/TextNode -->

- Plugins
- [Node Types](nodes.md)
- TextNode

On this page

The text node represents text where both the whole node or individual character ranges can have properties such as color (fills), font size, font name, etc.

When working with text nodes, there are a lot of things to consider, including mixed styles, loading fonts, and missing fonts. Please refer to the [Working with Text](../working-with-text.md) page for more information.

## Text node properties[​](#text-node-properties "Direct link to Text node properties")

### type: 'TEXT' [readonly]

The type of this node, represented by the string literal "TEXT"

---

### clone(): [TextNode](TextNode.md)

Duplicates the text node. By default, the duplicate will be parented under `figma.currentPage`.

---

### hasMissingFont: boolean [readonly]

Returns whether the text uses a font currently not available to the document.

---

### textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'

The horizontal alignment of the text with respect to the textbox. Setting this property requires the font the be loaded.

---

### textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM'

The vertical alignment of the text with respect to the textbox. Setting this property requires the font the be loaded.

---

### [textAutoResize](properties/TextNode-textautoresize.md): 'NONE' | 'WIDTH\_AND\_HEIGHT' | 'HEIGHT' | 'TRUNCATE'

The behavior of how the size of the text box adjusts to fit the characters. Setting this property requires the font the be loaded.

[View more →](properties/TextNode-textautoresize.md)

---

### [textTruncation](properties/TextNode-texttruncation.md): 'DISABLED' | 'ENDING'

Whether this text node will truncate with an ellipsis when the text node size is smaller than the text inside.

[View more →](properties/TextNode-texttruncation.md)

---

### [maxLines](properties/TextNode-maxlines.md): number | null

The maximum number of lines a text node can reach before it truncates. Only applicable when [`textTruncation`](properties/TextNode-texttruncation.md) is set to `"ENDING"`.

[View more →](properties/TextNode-maxlines.md)

---

### paragraphIndent: number | [figma.mixed](properties/figma-mixed.md)

The indentation of paragraphs (offset of the first line from the left). Setting this property requires the font the be loaded.

---

### paragraphSpacing: number | [figma.mixed](properties/figma-mixed.md)

The vertical distance between paragraphs. Setting this property requires the font to be loaded.

---

### listSpacing: number | [figma.mixed](properties/figma-mixed.md)

The vertical distance between lines of a list.

---

### hangingPunctuation: boolean

Whether punctuation, like quotation marks, hangs outside the text box.

---

### hangingList: boolean

Whether numbered list counters or unordered list bullets hang outside the text box.

---

### [autoRename](properties/TextNode-autorename.md): boolean

Whether updating the characters in the text node should update the name of the node. If this is set to true, `name` will be auto-derived from `characters`.

[View more →](properties/TextNode-autorename.md)

---

## Text content[​](#text-content "Direct link to Text content")

### [characters](properties/TextNode-characters.md): string

The raw characters in the text node. Setting this property requires the font the be loaded.

[View more →](properties/TextNode-characters.md)

---

### [insertCharacters](properties/TextNode-insertcharacters.md)(start: number, characters: string, useStyle?: 'BEFORE' | 'AFTER'): void

Insert `characters` at index `start` in the text.

[View more →](properties/TextNode-insertcharacters.md)

---

### [deleteCharacters](properties/TextNode-deletecharacters.md)(start: number, end: number): void

Remove characters in the text from `start` (inclusive) to `end` (exclusive).

[View more →](properties/TextNode-deletecharacters.md)

---

## Text and text range properties[​](#text-and-text-range-properties "Direct link to Text and text range properties")

These properties can be applied to the whole text node, or parts of the text on specific character ranges.

### fontSize: number | [figma.mixed](properties/figma-mixed.md)

The size of the font. Has minimum value of 1.

---

### fontName: [FontName](FontName.md) | [figma.mixed](properties/figma-mixed.md)

The font family (e.g. "Inter"), and font style (e.g. "Regular"). Setting this property to a different value requires the new font to be loaded.

---

### fontWeight: number | [figma.mixed](properties/figma-mixed.md) [readonly]

The weight of the font (e.g. 400 for "Regular", 700 for "Bold").

---

### textCase: [TextCase](TextCase.md) | [figma.mixed](properties/figma-mixed.md)

Overrides the case of the raw characters in the text node. Requires the font to be loaded.

---

### [openTypeFeatures](properties/TextNode-opentypefeatures.md): { readonly [feature in [OpenTypeFeature](OpenTypeFeature.md)]: boolean} | [figma.mixed](properties/figma-mixed.md) [readonly]

[OpenType features](https://help.figma.com/hc/en-us/articles/4913951097367) that have been explicitly enabled or disabled.

[View more →](properties/TextNode-opentypefeatures.md)

---

### textDecoration: [TextDecoration](TextDecoration.md) | [figma.mixed](properties/figma-mixed.md)

Whether the text is underlined or has a strikethrough. Requires the font to be loaded.

---

### textDecorationStyle: [TextDecorationStyle](TextDecorationStyle.md) | [figma.mixed](properties/figma-mixed.md) | null

The text decoration style (e.g. "SOLID"). If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationOffset: [TextDecorationOffset](TextDecorationOffset.md) | [figma.mixed](properties/figma-mixed.md) | null

The text decoration offset. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationThickness: [TextDecorationThickness](TextDecorationThickness.md) | [figma.mixed](properties/figma-mixed.md) | null

The text decoration thickness. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationColor: [TextDecorationColor](TextDecorationColor.md) | [figma.mixed](properties/figma-mixed.md) | null

The text decoration color. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### textDecorationSkipInk: boolean | [figma.mixed](properties/figma-mixed.md) | null

Whether the text decoration skips descenders. If the text is not underlined, this value will be null. Requires the font to be loaded.

---

### letterSpacing: [LetterSpacing](LetterSpacing.md) | [figma.mixed](properties/figma-mixed.md)

The spacing between the individual characters. Requires the font to be loaded.

---

### lineHeight: [LineHeight](LineHeight.md) | [figma.mixed](properties/figma-mixed.md)

The spacing between the lines in a paragraph of text. Requires the font to be loaded.

---

### leadingTrim: [LeadingTrim](LeadingTrim.md) | [figma.mixed](properties/figma-mixed.md)

The removal of the vertical space above and below text glyphs. Requires the font to be loaded.

---

### textStyleId: string | [figma.mixed](properties/figma-mixed.md)

The id of the [`TextStyle`](TextStyle.md) object that the text properties of this node are linked to. Requires the font to be loaded.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use [`setTextStyleIdAsync`](TextNode.md#settextstyleidasync) to update the style.

---

### setTextStyleIdAsync(styleId: string): Promise<void>

Set the [`TextStyle`](TextStyle.md) that the text properties of this node are linked to. Requires the font to be loaded.

---

### hyperlink: [HyperlinkTarget](HyperlinkTarget.md) | null | [figma.mixed](properties/figma-mixed.md)

A [`HyperlinkTarget`](HyperlinkTarget.md) if the text node has exactly one hyperlink, or `null` if the node has none.

---

## Text range functions[​](#text-range-functions "Direct link to Text range functions")

These functions allow you to get and set text properties on parts of the text.

### [getStyledTextSegments](properties/TextNode-getstyledtextsegments.md)<StyledTextSegmentFields extends (keyof Omit< StyledTextSegment, 'characters' | 'start' | 'end' >)[]>(fields: StyledTextSegmentFields, start?: number, end?: number): Array<Pick<[StyledTextSegment](StyledTextSegment.md), StyledTextSegmentFields[number] | 'characters' | 'start' | 'end'>>

Get text segments along with the desired text properties (font size, text case, etc...)

[View more →](properties/TextNode-getstyledtextsegments.md)

---

### getRangeFontSize(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Get the `fontSize` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeFontSize(start: number, end: number, value: number): void

Set the `fontSize` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeFontName(start: number, end: number): [FontName](FontName.md) | [figma.mixed](properties/figma-mixed.md)

Get the `fontName` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeFontName(start: number, end: number, value: [FontName](FontName.md)): void

Set the `fontName` from characters in range `start` (inclusive) to `end` (exclusive). Requires the new font to be loaded.

---

### getRangeAllFontNames(start: number, end: number): [FontName](FontName.md)[]

Get the `fontName`s from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeFontWeight(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Get the `fontWeight` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextCase(start: number, end: number): [TextCase](TextCase.md) | [figma.mixed](properties/figma-mixed.md)

Get the `textCase` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextCase(start: number, end: number, value: [TextCase](TextCase.md)): void

Set the `textCase` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeOpenTypeFeatures(start: number, end: number): { readonly [feature in [OpenTypeFeature](OpenTypeFeature.md)]: boolean} | [figma.mixed](properties/figma-mixed.md)

Get the [`openTypeFeatures`](properties/TextNode-opentypefeatures.md) from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeTextDecoration(start: number, end: number): [TextDecoration](TextDecoration.md) | [figma.mixed](properties/figma-mixed.md)

Get the `textDecoration` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextDecoration(start: number, end: number, value: [TextDecoration](TextDecoration.md)): void

Set the `textDecoration` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeTextDecorationStyle(start: number, end: number): [TextDecorationStyle](TextDecorationStyle.md) | [figma.mixed](properties/figma-mixed.md) | null

Get the `textDecorationStyle` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextDecorationStyle(start: number, end: number, value: [TextDecorationStyle](TextDecorationStyle.md)): void

Set the `textDecorationStyle` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeTextDecorationOffset(start: number, end: number): [TextDecorationOffset](TextDecorationOffset.md) | [figma.mixed](properties/figma-mixed.md) | null

Get the `textDecorationOffset` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextDecorationOffset(start: number, end: number, value: [TextDecorationOffset](TextDecorationOffset.md)): void

Set the `textDecorationOffset` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeTextDecorationThickness(start: number, end: number): [TextDecorationThickness](TextDecorationThickness.md) | [figma.mixed](properties/figma-mixed.md) | null

Get the `textDecorationThickness` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextDecorationThickness(start: number, end: number, value: [TextDecorationThickness](TextDecorationThickness.md)): void

Set the `textDecorationThickness` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeTextDecorationColor(start: number, end: number): [TextDecorationColor](TextDecorationColor.md) | [figma.mixed](properties/figma-mixed.md) | null

Get the `textDecorationColor` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextDecorationColor(start: number, end: number, value: [TextDecorationColor](TextDecorationColor.md)): void

Set the `textDecorationColor` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeTextDecorationSkipInk(start: number, end: number): boolean | [figma.mixed](properties/figma-mixed.md) | null

Get the `textDecorationSkipInk` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextDecorationSkipInk(start: number, end: number, value: boolean): void

Set the `textDecorationSkipInk` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeLetterSpacing(start: number, end: number): [LetterSpacing](LetterSpacing.md) | [figma.mixed](properties/figma-mixed.md)

Get the `letterSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeLetterSpacing(start: number, end: number, value: [LetterSpacing](LetterSpacing.md)): void

Set the `letterSpacing` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeLineHeight(start: number, end: number): [LineHeight](LineHeight.md) | [figma.mixed](properties/figma-mixed.md)

Get the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeLineHeight(start: number, end: number, value: [LineHeight](LineHeight.md)): void

Set the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeHyperlink(start: number, end: number): [HyperlinkTarget](HyperlinkTarget.md) | null | [figma.mixed](properties/figma-mixed.md)

Get the `hyperlink` from characters in range `start` (inclusive) to `end` (exclusive). Returns a [`HyperlinkTarget`](HyperlinkTarget.md) if the range contains exactly one hyperlink, or `null` if the range contains none.

---

### setRangeHyperlink(start: number, end: number, value: [HyperlinkTarget](HyperlinkTarget.md) | null): void

Set the `hyperlink` from characters in range `start` (inclusive) to `end` (exclusive). Removes the hyperlink in range if `value` is `null`.

---

### getRangeFills(start: number, end: number): [Paint](Paint.md)[] | [figma.mixed](properties/figma-mixed.md)

Get the `fills` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeFills(start: number, end: number, value: [Paint](Paint.md)[]): void

Set the `fills` from characters in range `start` (inclusive) to `end` (exclusive). Requires font to be loaded.

Can be bound to color variables by using [`setBoundVariableForPaint`](figma-variables.md#setboundvariableforpaint) on one or more of the provided `Paint`s

---

### getRangeTextStyleId(start: number, end: number): string | [figma.mixed](properties/figma-mixed.md)

Get the `textStyleId` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeTextStyleIdAsync(start: number, end: number, styleId: string): Promise<void>

Set the provided [`TextStyle`](TextStyle.md) to characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### setRangeTextStyleId(start: number, end: number, value: string): void

**DEPRECATED:** Use `setRangeTextStyleIdAsync` instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Set the `textStyleId` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeFillStyleId(start: number, end: number): string | [figma.mixed](properties/figma-mixed.md)

Get the `fillStyleId` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeFillStyleIdAsync(start: number, end: number, styleId: string): Promise<void>

Set the provided [`PaintStyle`](PaintStyle.md) as a fill to characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeFillStyleId(start: number, end: number, value: string): void

**DEPRECATED:** Use `setRangeFillStyleIdAsync` instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Set the `fillStyleId` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

---

### getRangeListOptions(start: number, end: number): [TextListOptions](TextListOptions.md) | [figma.mixed](properties/figma-mixed.md)

Get the `textListOptions` from characters in range `start` (inclusive) to `end` (exclusive). Returns a [`TextListOptions`](TextListOptions.md)

---

### setRangeListOptions(start: number, end: number, value: [TextListOptions](TextListOptions.md)): void

Set the `textListOptions` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeListSpacing(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Get the `listSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeListSpacing(start: number, end: number, value: number): void

Set the `listSpacing` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeIndentation(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Get the `indentation` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeIndentation(start: number, end: number, value: number): void

Set the `indentation` from characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeParagraphIndent(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Get the `paragraphIndent` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeParagraphIndent(start: number, end: number, value: number): void

Set the `paragraphIndent` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeParagraphSpacing(start: number, end: number): number | [figma.mixed](properties/figma-mixed.md)

Get the `paragraphSpacing` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeParagraphSpacing(start: number, end: number, value: number): void

Set the `paragraphSpacing` for a paragraph containing characters in range `start` (inclusive) to `end` (exclusive).

---

### getRangeBoundVariable(start: number, end: number, field: [VariableBindableTextField](VariableBindableTextField.md)): [VariableAlias](VariableAlias.md) | null | [figma.mixed](properties/figma-mixed.md)

Get the `boundVariable` for a given field from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeBoundVariable(start: number, end: number, field: [VariableBindableTextField](VariableBindableTextField.md), variable: [Variable](Variable.md) | null): void

Set the `boundVariable` for a given field from characters in range `start` (inclusive) to `end` (exclusive). Requires any new fonts to be loaded.

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

## Blend-related properties[​](#blend-related-properties "Direct link to Blend-related properties")

### opacity: number

Opacity of the node, as shown in the Layer panel. Must be between 0 and 1.

---

### blendMode: [BlendMode](BlendMode.md)

Blend mode of this node, as shown in the Layer panel. In addition to the blend modes that paints & effects support, the layer blend mode can also have the value PASS\_THROUGH.

---

### [isMask](properties/nodes-ismask.md): boolean

Whether this node is a mask. A mask node masks its subsequent siblings.

[View more →](properties/nodes-ismask.md)

---

### maskType: [MaskType](MaskType.md)

Type of masking to use if this node is a mask. Defaults to `"ALPHA"`. You must check `isMask` to verify that this is a mask; changing `maskType` does not automatically turn on `isMask`, and a node that is not a mask can still have a `maskType`.

---

### effects: ReadonlyArray<[Effect](Effect.md)>

Array of effects. See [`Effect`](Effect.md) type. For help on how to change this value, see [Editing Properties](../editing-properties.md).

---

### effectStyleId: string

The id of the [`EffectStyle`](EffectStyle.md) object that the properties of this node are linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setEffectStyleIdAsync` to update the style.

---

### setEffectStyleIdAsync(styleId: string): Promise<void>

Set the [`EffectStyle`](EffectStyle.md) that the properties of this node are linked to.

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

### [strokes](properties/nodes-strokes.md): ReadonlyArray<[Paint](Paint.md)>

The paints used to fill the area of the shape's strokes. For help on how to change this value, see [Editing Properties](../editing-properties.md).

[View more →](properties/nodes-strokes.md)

---

### strokeStyleId: string

The id of the [`PaintStyle`](PaintStyle.md) object that the [`strokes`](properties/nodes-strokes.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setStrokeStyleIdAsync` to update the style.

---

### setStrokeStyleIdAsync(styleId: string): Promise<void>

Set the [`PaintStyle`](PaintStyle.md) that the [`strokes`](properties/nodes-strokes.md) property of this node is linked to.

---

### strokeWeight: number | [figma.mixed](properties/figma-mixed.md)

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

### [strokeJoin](properties/nodes-strokejoin.md): [StrokeJoin](StrokeJoin.md) | [figma.mixed](properties/figma-mixed.md)

The decoration applied to vertices which have two or more connected segments.

[View more →](properties/nodes-strokejoin.md)

---

### [strokeAlign](properties/nodes-strokealign.md): 'CENTER' | 'INSIDE' | 'OUTSIDE'

The alignment of the stroke with respect to the boundaries of the shape.

[View more →](properties/nodes-strokealign.md)

---

### dashPattern: ReadonlyArray<number>

A list of numbers specifying alternating dash and gap lengths, in pixels.

---

### strokeGeometry: [VectorPaths](VectorPath.md#vector-paths) [readonly]

An array of paths representing the object strokes relative to the node.
StrokeGeometry is always from the center regardless of the nodes `strokeAlign`.

---

### setStrokesAsync(strokes: ReadonlyArray<[Paint](Paint.md)>): Promise<void>

Sets the strokes of the node asynchronously. This is the only way to set pattern strokes on a node, since we need to ensure that the source node of the pattern is loaded first. See [Adding Pattern Fills and Strokes](../adding-pattern-fills-and-strokes.md) for more information.

---

### [strokeCap](properties/nodes-strokecap.md): [StrokeCap](StrokeCap.md) | [figma.mixed](properties/figma-mixed.md)

The decoration applied to vertices which have only one connected segment.

[View more →](properties/nodes-strokecap.md)

---

### strokeMiterLimit: number

The miter limit on the stroke. This is the same as the [SVG miter limit](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit).

---

### outlineStroke(): [VectorNode](VectorNode.md) | null

This method performs an action similar to using the "Outline Stroke" function in the editor from the right-click menu. However, this method creates and returns a new node while leaving the original intact. Returns `null` if the node has no strokes.

---

### fillGeometry: [VectorPaths](VectorPath.md#vector-paths) [readonly]

An array of paths representing the object fills relative to the node.

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

### [layoutAlign](properties/nodes-layoutalign.md): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'

Applicable only on direct children of auto-layout frames. Determines if the layer should stretch along the parent’s counter axis. Defaults to `“INHERIT”`.

[View more →](properties/nodes-layoutalign.md)

---

### [layoutGrow](properties/nodes-layoutgrow.md): number

This property is applicable only for direct children of auto-layout frames. Determines whether a layer should stretch along the parent’s primary axis. 0 corresponds to a fixed size and 1 corresponds to stretch.

[View more →](properties/nodes-layoutgrow.md)

---

### [layoutPositioning](properties/nodes-layoutpositioning.md): 'AUTO' | 'ABSOLUTE'

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

[View more →](properties/nodes-layoutpositioning.md)

---

### [setGridChildPosition](properties/nodes-setgridchildposition.md)(rowIndex: number, columnIndex: number): void

Applicable only on direct children of 'GRID' auto-layout frames. Sets the position of the node

[View more →](properties/nodes-setgridchildposition.md)

---

### [gridRowAnchorIndex](properties/nodes-gridrowanchorindex.md): number [readonly]

Applicable only on direct children of grid auto-layout frames. Determines the starting row index for this node within the parent grid.

[View more →](properties/nodes-gridrowanchorindex.md)

---

### [gridColumnAnchorIndex](properties/nodes-gridcolumnanchorindex.md): number [readonly]

Applicable only on direct children of grid auto-layout frames. Determines the starting column index for this node within the parent grid.

[View more →](properties/nodes-gridcolumnanchorindex.md)

---

### [gridRowSpan](properties/nodes-gridrowspan.md): number

Applicable only on direct children of grid auto-layout frames. Determines the number of rows this node will span within the parent grid.

[View more →](properties/nodes-gridrowspan.md)

---

### [gridColumnSpan](properties/nodes-gridcolumnspan.md): number

Applicable only on direct children of grid auto-layout frames. Determines the number of columns this node will span within the parent grid.

[View more →](properties/nodes-gridcolumnspan.md)

---

### [gridChildHorizontalAlign](properties/nodes-gridchildhorizontalalign.md): 'MIN' | 'CENTER' | 'MAX' | 'AUTO'

Applicable only on direct children of grid auto-layout frames. Controls the horizontal alignment of the node within its grid cell.

[View more →](properties/nodes-gridchildhorizontalalign.md)

---

### [gridChildVerticalAlign](properties/nodes-gridchildverticalalign.md): 'MIN' | 'CENTER' | 'MAX' | 'AUTO'

Applicable only on direct children of grid auto-layout frames. Controls the vertical alignment of the node within its grid cell.

[View more →](properties/nodes-gridchildverticalalign.md)

---

### absoluteRenderBounds: [Rect](Rect.md) | null [readonly]

The actual bounds of a node accounting for drop shadows, thick strokes, and anything else that may fall outside the node's regular bounding box defined in `x`, `y`, `width`, and `height`. The `x` and `y` inside this property represent the absolute position of the node on the page. This value will be `null` if the node is invisible.

---

### constrainProportions: boolean

**DEPRECATED:** Use `targetAspectRatio`, `lockAspectRatio`, and `unlockAspectRatio` instead.

When toggled, causes the layer to keep its proportions when the user resizes it via the properties panel.

---

### [rotation](properties/nodes-rotation.md): number

The rotation of the node in degrees. Returns values from -180 to 180. Identical to `Math.atan2(-m10, m00)` in the [`relativeTransform`](properties/nodes-relativetransform.md) matrix. When setting `rotation`, it will also set `m00`, `m01`, `m10`, `m11`.

[View more →](properties/nodes-rotation.md)

---

### [layoutSizingHorizontal](properties/nodes-layoutsizinghorizontal.md): 'FIXED' | 'HUG' | 'FILL'

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](properties/nodes-layoutgrow.md), [`layoutAlign`](properties/nodes-layoutalign.md), [`primaryAxisSizingMode`](properties/nodes-primaryaxissizingmode.md), and [`counterAxisSizingMode`](properties/nodes-counteraxissizingmode.md). This field maps directly to the "Horizontal sizing" dropdown in the Figma UI.

[View more →](properties/nodes-layoutsizinghorizontal.md)

---

### [layoutSizingVertical](properties/nodes-layoutsizingvertical.md): 'FIXED' | 'HUG' | 'FILL'

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](properties/nodes-layoutgrow.md), [`layoutAlign`](properties/nodes-layoutalign.md), [`primaryAxisSizingMode`](properties/nodes-primaryaxissizingmode.md), and [`counterAxisSizingMode`](properties/nodes-counteraxissizingmode.md). This field maps directly to the "Vertical sizing" dropdown in the Figma UI.

[View more →](properties/nodes-layoutsizingvertical.md)

---

### [resize](properties/nodes-resize.md)(width: number, height: number): void

Resizes the node. If the node contains children with constraints, it applies those constraints during resizing. If the parent has auto-layout, causes the parent to be resized.

[View more →](properties/nodes-resize.md)

---

### [resizeWithoutConstraints](properties/nodes-resizewithoutconstraints.md)(width: number, height: number): void

Resizes the node. Children of the node are never resized, even if those children have constraints. If the parent has auto-layout, causes the parent to be resized (this constraint cannot be ignored).

[View more →](properties/nodes-resizewithoutconstraints.md)

---

### [rescale](properties/nodes-rescale.md)(scale: number): void

Rescales the node. This API function is the equivalent of using the Scale Tool from the toolbar.

[View more →](properties/nodes-rescale.md)

---

### [constraints](properties/nodes-constraints.md): [Constraints](Constraints.md)

Constraints of this node relative to its containing [`FrameNode`](FrameNode.md), if any.

[View more →](properties/nodes-constraints.md)

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

## Reaction prototyping-related properties[​](#reaction-prototyping-related-properties "Direct link to Reaction prototyping-related properties")

### [reactions](properties/nodes-reactions.md): ReadonlyArray<[Reaction](Reaction.md)>

List of [Reactions](Reaction.md) on this node, which includes both the method of interaction with this node in a prototype, and the behavior of that interaction. For help on how to change this value, see [Editing Properties](../editing-properties.md).

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setReactionsAsync` to update the value.

[View more →](properties/nodes-reactions.md)

---

### setReactionsAsync(reactions: Array<[Reaction](Reaction.md)>): Promise<void>

Updates the reactions on this node. See [`reactions`](properties/nodes-reactions.md) for a usage example.

---

## Annotation properties[​](#annotation-properties "Direct link to Annotation properties")

### annotations: ReadonlyArray<[Annotation](Annotation.md)>

Annotations on the node.

Learn more about annotations in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935) or see the [Annotation type](Annotation.md) for usage examples.

---

## Complex stroke-related properties[​](#complex-stroke-related-properties "Direct link to Complex stroke-related properties")

### [variableWidthStrokeProperties](properties/nodes-variablewidthstrokeproperties.md): [VariableWidthStrokeProperties](VariableWidthStrokeProperties.md) | null

The variable width stroke properties for the node.

[View more →](properties/nodes-variablewidthstrokeproperties.md)

---

### [complexStrokeProperties](properties/nodes-complexstrokeproperties.md): [ComplexStrokeProperties](ComplexStrokeProperties.md)

The complex stroke properties for nodes using brush or dynamic strokes.

[View more →](properties/nodes-complexstrokeproperties.md)

---

[Previous

resizeColumn](properties/TableNode-resizecolumn.md)[Next

textAutoResize](properties/TextNode-textautoresize.md)

- [Text node properties](#text-node-properties)
- [Text content](#text-content)
- [Text and text range properties](#text-and-text-range-properties)
- [Text range functions](#text-range-functions)
- [Base node properties](#base-node-properties)
- [Plugin data properties](#plugin-data-properties)
- [Dev resource properties](#dev-resource-properties)
- [Scene node properties](#scene-node-properties)
- [Blend-related properties](#blend-related-properties)
- [Geometry-related properties](#geometry-related-properties)
- [Layout-related properties](#layout-related-properties)
- [Lock aspect ratio properties](#lock-aspect-ratio-properties)
- [Export-related properties](#export-related-properties)
- [Reaction prototyping-related properties](#reaction-prototyping-related-properties)
- [Annotation properties](#annotation-properties)
- [Complex stroke-related properties](#complex-stroke-related-properties)
