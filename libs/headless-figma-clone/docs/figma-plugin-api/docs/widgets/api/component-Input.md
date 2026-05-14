<!-- source: https://developers.figma.com/docs/widgets/api/component-Input -->

- Widgets
- Component Types
- Input

On this page

`Input` components support editing text directly inside the widget.

For usage examples, see the [Text Editing](../text-editing.md) guide.

## InputProps[​](#inputprops "Direct link to InputProps")

### onTextEditEnd: (event: [TextEditEvent](type-TextEditEvent.md#text-edit-event)) => void

A method that is called when a user exits text edit mode (similar to [`onBlur`](https://reactjs.org/docs/events.html#onblur) in React).

The `event` is an object containing the characters in the editable text field. i.e.
`{ characters: "someText" }`

The `onTextEditEnd` event can always be triggered via clicking out of the element, hitting `Escape`, or `Cmd + Enter`. See [`inputBehavior`](#inputbehavior) for other ways to trigger `onTextEditEnd` and blur the input.

---

### value: string | null

The value of the editable text. Typically, this value will be a synced variable that will be set in the `onTextEditEnd` callback.

---

### placeholder?: string

Placeholder text that shows whenever `value` is `null` or an empty string.

---

### placeholderProps?: [PlaceholderProps](type-PlaceholderProps.md#placeholder-props)

Props to customize the text placeholder. Use this prop if you want the placeholder to render differently compared to the editable text.

All relevant props on the Input component will automatically be are applied to both the editable text and the placeholder. Any additional props specified here will then be applied only to the placeholder.

---

### inputFrameProps?: Omit<[AutoLayoutProps](component-AutoLayout.md#auto-layout-props), 'width'>

Props to customize the Autolayout frame that parents the editable text and placeholder.

---

### width?: [Size](type-Size.md#size)

The width of the editable text. The text will wrap around if the user types beyond the width. Defaults to `200`.

---

### inputBehavior?: 'wrap' | 'truncate' | 'multiline'

Allows you to specify some interactions and resizing behavior of the Input component.

| value | description |
| --- | --- |
| `"wrap"` (default) | Typing `Enter` blurs the input and triggers `onTextEditEnd`. On overflow, the text will wrap to the next line and the height of the input will autoresize. |
| `"truncate"` | Typing `Enter` blurs the input and triggers `onTextEditEnd`. On overflow, the text will truncate. |
| `"multiline"` | Typing `Enter` will create a new line. On overflow, the text will wrap to the next line and the height of the input will resize automatically. |

---

## Text Style Props[​](#text-style-props "Direct link to Text Style Props")

### href?: string

If specified, turns the text node into a link that navigates to the specified `href` on click.

---

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

### paragraphIndent?: number

The indentation of paragraphs (offset of the first line from the left).

---

### paragraphSpacing?: number

The vertical distance between paragraphs.

---

### horizontalAlignText?: 'left' | 'right' | 'center' | 'justified'

The horizontal alignment of the text with respect to the Text node.

---

### verticalAlignText?: 'top' | 'center' | 'bottom'

The vertical alignment of the text with respect to the Text node.

---

### lineHeight?: number | string | 'auto'

The spacing between the lines in a paragraph of text.

---

### truncate?: boolean | number

Whether the text should truncate if it overflows the size of the node. Set to a number to
truncate after a specific number of lines.

---

### stroke?: HexCode | [Color](type-Color.md#color) | [SolidPaint](type-SolidPaint.md#solid-paint) | [GradientPaint](type-GradientPaint.md#gradient-paint) | ([SolidPaint](type-SolidPaint.md#solid-paint) | [GradientPaint](type-GradientPaint.md#gradient-paint))[]

The paints used to fill the area of the node's stroke.

---

### strokeWidth?: number

The thickness of the stroke, in pixels. This value must be non-negative and can be fractional.

---

### strokeAlign?: [StrokeAlign](type-StrokeAlign.md#stroke-align)

The alignment of the stroke with respect to the boundaries of the node.

Center-aligned stroke means the center of the stroke falls exactly on the geometry. Inside-aligned stroke shifts the stroke so it lies completely inside the shape, and outside-aligned stroke is vice versa.

info

Inside and outside stroke are actually implemented by doubling the stroke weight and masking the stroke by the fill. This means inside-aligned stroke will never draw strokes outside the fill and outside-aligned stroke will never draw strokes inside the fill.

---

### rotation?: number

The rotation of the node in degrees. Expects values from -180 to 180.

The rotation is with respect to the top-left of the object. Therefore, it is independent from the position of the object.

---

## `BaseProps`[​](#baseprops "Direct link to baseprops")

### name?: string

The name of the component. This is useful to specify a data-layer attribute to make things more debuggable when you inspect the sublayers of your widget.

---

### hidden?: boolean

Toggles whether to show the component.

---

### onClick?: (event: [WidgetClickEvent](type-WidgetClickEvent.md#widget-click-event)) => Promise<any> | void

Attach a click handler on the given node. If the given function is async or returns a promise, the widget is only terminated when the async function has completed and the promise has been resolved.
The click handler is also passed a [`WidgetClickEvent`](type-WidgetClickEvent.md) object that contains additional information about the click.

See also: [Handling User Events](../handling-user-events.md).

---

### key?: string | number

The key of the component.

---

### hoverStyle?: [HoverStyle](type-HoverStyle.md#hover-style)

The style to be applied when the mouse is hovering over the component.

---

### tooltip?: string

The tooltip that is shown to the user when hovering over the component.

---

### positioning?: 'auto' | 'absolute'

This value is ignored unless the node is a direct child of an AutoLayout frame.

| value | description |
| --- | --- |
| 'auto' | Layout this node according to auto-layout rules. |
| 'absolute' | Take this node out of the auto-layout flow, while still nesting it inside the auto-layout frame. This allows explicitly setting `x`, `y`, `width`, and `height`. |

---

### `BlendProps`[​](#blendprops "Direct link to blendprops")

### blendMode?: [BlendMode](type-BlendMode.md#blend-mode)

The blendMode of the component.

---

### opacity?: number

The opacity of the component.

---

### effect?: [Effect](type-Effect.md#effect) | [Effect](type-Effect.md#effect)[]

The effect of the component.

---

### `ConstraintProps`[​](#constraintprops "Direct link to constraintprops")

### x?: number | [HorizontalConstraint](type-Constraint.md#horizontal-constraint)

The x position of the node.

This value is ignored if the node is a child of an AutoLayout frame and has positioning set to 'auto'.

---

### y?: number | [VerticalConstraint](type-Constraint.md#vertical-constraint)

The y position of the node.

This value is ignored if the node is a child of an AutoLayout frame and has positioning set to 'auto'.

---

## Default Props[​](#default-props "Direct link to Default Props")

| Prop | Defaults |
| --- | --- |
| `name` | `""` |
| `hidden` | `false` |
| `x` | `0` |
| `y` | `0` |
| `blendMode` | `"pass-through"` |
| `opacity` | `1` |
| `effect` | `[]` |
| `width` | `200` |
| `height` | `"hug-contents"` |
| `rotation` | `0` |
| `flipVertical` | `false` |
| `fontFamily` | `"Inter"` |
| `horizontalAlignText` | `"left"` |
| `verticalAlignText` | `"top"` |
| `letterSpacing` | `0` |
| `lineHeight` | `"auto"` |
| `textDecoration` | `"none"` |
| `textCase` | `"original"` |
| `fontSize` | `16` |
| `italic` | `false` |
| `fill` | `"#000000"` |
| `blendMode` | `"normal"` |
| `fontWeight` | `400` |
| `paragraphIndent` | `0` |
| `paragraphSpacing` | `0` |
| `placeholderProps` | `{ opacity: 0.3 }` |

[Previous

Span](component-Span.md)[Next

Rectangle](component-Rectangle.md)

- [InputProps](#inputprops)
- [Text Style Props](#text-style-props)
- [`BaseProps`](#baseprops)
  - [`BlendProps`](#blendprops)
  - [`ConstraintProps`](#constraintprops)
- [Default Props](#default-props)
