<!-- source: https://developers.figma.com/docs/plugins/api/StyledTextSegment -->

- Plugins
- [Data Types](data-types.md)
- StyledTextSegment

Represents a range of characters in a text node and its styles.

### characters: string

The characters in the range of text with the same styles.

---

### start: number

Start index (inclusive) of the range of characters.

---

### end: number

End index (exclusive) of the range of characters.

---

### fontSize: number

The size of the font. Has minimum value of 1.

---

### fontName: [FontName](FontName.md)

The font family (e.g. "Inter"), and font style (e.g. "Regular").

---

### fontWeight: number

The weight of the font (e.g. 400 for "Regular", 700 for "Bold").

---

### fontStyle: [FontStyle](FontStyle.md)

The style of the font (i.e. "REGULAR", "ITALIC").

---

### textDecoration: [TextDecoration](TextDecoration.md)

Whether the text is underlined or has a strikethrough.

---

### textDecorationStyle: [TextDecorationStyle](TextDecorationStyle.md) | null

The text decoration style (e.g. "SOLID"). If the text is not underlined, this value will be null.

---

### textDecorationOffset: [TextDecorationOffset](TextDecorationOffset.md) | null

The text decoration offset. If the text is not underlined, this value will be null.

---

### textDecorationThickness: [TextDecorationThickness](TextDecorationThickness.md) | null

The text decoration thickness. If the text is not underlined, this value will be null.

---

### textDecorationColor: [TextDecorationColor](TextDecorationColor.md) | null

The text decoration color. If the text is not underlined, this value will be null.

---

### textDecorationSkipInk: boolean | null

Whether the text decoration skips descenders. If the text is not underlined, this value will be null.

---

### textCase: [TextCase](TextCase.md)

Overrides the case of the raw characters in the text node.

---

### lineHeight: [LineHeight](LineHeight.md)

The spacing between the lines in a paragraph of text.

---

### letterSpacing: [LetterSpacing](LetterSpacing.md)

The spacing between the individual characters.

---

### fills: [Paint](Paint.md)[]

The paints used to fill the area of the shape.

---

### textStyleId: string

The id of the TextStyle object that the text properties of this node are linked to

---

### fillStyleId: string

The id of the PaintStyle object that the fills property of this node is linked to.

---

### listOptions: [TextListOptions](TextListOptions.md)

The list settings.

---

### listSpacing: number

The spacing between list items.

---

### indentation: number

The indentation.

---

### paragraphIndent: number

The paragraph indent.

---

### paragraphSpacing: number

The paragraph spacing.

---

### hyperlink: [HyperlinkTarget](HyperlinkTarget.md) | null

A HyperlinkTarget if the text node has exactly one hyperlink, or null if the node has none.

---

### openTypeFeatures: { readonly [feature in [OpenTypeFeature](OpenTypeFeature.md)]: boolean}

OpenType features that have been explicitly enabled or disabled.

---

### boundVariables?: { [field in [VariableBindableTextField](VariableBindableTextField.md)]?: [VariableAlias](VariableAlias.md)}

The variables bound to a particular field.

---

### textStyleOverrides: [TextStyleOverrideType](TextStyleOverrides.md#text-style-override-type)[]

Overrides applied over a text style.

---

[Previous

StyleConsumers](StyleConsumers.md)[Next

TableCellNode](TableCellNode.md)
