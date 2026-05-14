<!-- source: https://developers.figma.com/docs/plugins/api/TextSublayer -->

- Plugins
- [Data Types](data-types.md)
- TextSublayer

On this page

Text sublayer nodes are pared-back versions of text nodes: they have most text properties (except `textAlignVertical` and `textAutoResize`, which are not editable on these nodes' text sublayers), as well as `fills`. They aren't resizable or repositionable.

You set text content as you would for any other text node (e.g. `sticky.text.characters = 'some text'`). As with all other text operations in Figma, you'll need to ensure [fonts are loaded](../working-with-text.md#loading-fonts).

## Basic traits[​](#basic-traits "Direct link to Basic traits")

### [toString](properties/nodes-tostring.md)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](properties/nodes-tostring.md)

---

### [parent](properties/nodes-parent.md): ([BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin)) | null [readonly]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](properties/nodes-appendchild.md).

[View more →](properties/nodes-parent.md)

---

tip

Tip: `parent` will always return a [ConnectorNode](ConnectorNode.md), [ShapeWithTextNode](ShapeWithTextNode.md), [StickyNode](StickyNode.md), or [TableCellNode](TableCellNode.md)

## Text node traits[​](#text-node-traits "Direct link to Text node traits")

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

### lineHeight: [LineHeight](LineHeight.md) | [figma.mixed](properties/figma-mixed.md)

The spacing between the lines in a paragraph of text. Requires the font to be loaded.

---

### leadingTrim: [LeadingTrim](LeadingTrim.md) | [figma.mixed](properties/figma-mixed.md)

The removal of the vertical space above and below text glyphs. Requires the font to be loaded.

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

### getRangeLineHeight(start: number, end: number): [LineHeight](LineHeight.md) | [figma.mixed](properties/figma-mixed.md)

Get the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive).

---

### setRangeLineHeight(start: number, end: number, value: [LineHeight](LineHeight.md)): void

Set the `lineHeight` from characters in range `start` (inclusive) to `end` (exclusive). Requires the font to be loaded.

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

[Previous

TextStyleOverrides](TextStyleOverrides.md)[Next

Transition](Transition.md)

- [Basic traits](#basic-traits)
- [Text node traits](#text-node-traits)
