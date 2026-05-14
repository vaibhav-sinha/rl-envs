<!-- source: https://developers.figma.com/docs/widgets/api/type-PlaceholderProps -->

- Widgets
- Data Types
- PlaceholderProps

These props allow you to style the placeholder text in the [`Input`](component-Input.md) component.

If any fields are `undefined`, then the values will be inherited from the props set (or the defaults) on the [`Input`](component-Input.md) component. To ensure consistent styling, we don't allow any alignment-based properties on `PlaceholderProps`. For example, if you want to center-align the text, you should set `horizontalAlignText` on the `Input` component itself, and the placeholder will match this alignment automatically.

### fontFamily?: string

The font family (e.g. "Inter"). The supported fonts are all the fonts in the [Google Fonts](https://fonts.google.com/) library.

---

### letterSpacing?: number | string

The spacing between the individual characters.

---

### textDecoration?: 'none' | 'strikethrough' | 'underline'

Whether the text is underlined or has a strikethrough.

---

### fontSize?: number

The size of the font. Has minimum value of 1.

---

### italic?: boolean

Whether or not to italicize the text content.

---

### textCase?: 'upper' | 'lower' | 'title' | 'original' | 'small-caps' | 'small-caps-forced'

Overrides the case of the raw characters in the text node.

---

### fontWeight?: [FontWeight](type-FontWeight.md#font-weight)

The font weight eg. 400, 500 or 'medium', 'bold'.

---

### fill?: HexCode | [Color](type-Color.md#color) | [Paint](type-Paint.md#paint) | ([SolidPaint](type-SolidPaint.md#solid-paint) | [GradientPaint](type-GradientPaint.md#gradient-paint))[]

The paints used to fill in the text.

---

### blendMode?: [BlendMode](type-BlendMode.md#blend-mode)

The blendMode of the component.

---

### opacity?: number

The opacity of the component.

---

### effect?: [Effect](type-Effect.md#effect) | [Effect](type-Effect.md#effect)[]

The effect of the component.

---

[Previous

Paint](type-Paint.md)[Next

PropertyMenu](type-PropertyMenu.md)
