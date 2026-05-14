<!-- source: https://developers.figma.com/docs/widgets/api/component-Ellipse -->

- Widgets
- Component Types
- Ellipse

On this page

`Ellipse` is useful for creating ellipses and circles.

### arcData?: [ArcData](type-ArcData.md#arc-data)

The "arc" properties of the Ellipse.

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

## `SizeProps`[​](#sizeprops "Direct link to sizeprops")

### width?: [Size](type-Size.md#size)

The width of the component.

---

### height?: [Size](type-Size.md#size)

The height of the component.

---

### minWidth?: number

The minWidth of this component. Only affects AutoLayout and its children.

---

### maxWidth?: number

The maxWidth of this component. Only affects AutoLayout and its children.

---

### minHeight?: number

The minHeight of this component. Only affects AutoLayout and its children.

---

### maxHeight?: number

The maxHeight of this component. Only affects AutoLayout and its children.

---

### rotation?: number

The rotation of the node in degrees. Expects values from -180 to 180.

The rotation is with respect to the top-left of the object. Therefore, it is independent from the position of the object.

---

## `GeometryProps`[​](#geometryprops "Direct link to geometryprops")

### fill?: HexCode | [Color](type-Color.md#color) | [Paint](type-Paint.md#paint) | ([SolidPaint](type-SolidPaint.md#solid-paint) | [GradientPaint](type-GradientPaint.md#gradient-paint))[]

The paints used to fill the area of the node

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

### strokeDashPattern?: number[]

The alternating stroke dash and gap lengths, in pixels. An empty array gives a solid stroke and a single value will be applied to both the dash and gap length.

---

## Default Props[​](#default-props "Direct link to Default Props")

| Prop | Default |
| --- | --- |
| `name` | `""` |
| `hidden` | `false` |
| `x` | `0` |
| `y` | `0` |
| `blendMode` | `"pass-through"` |
| `opacity` | `1` |
| `effect` | `[]` |
| `fill` | `[]` |
| `stroke` | `[]` |
| `strokeWidth` | `1` |
| `strokeAlign` | `"inside"` |
| `rotation` | `0` |

[Previous

Image](component-Image.md)[Next

SVG](component-SVG.md)

- [`BaseProps`](#baseprops)
  - [`BlendProps`](#blendprops)
  - [`ConstraintProps`](#constraintprops)
- [`SizeProps`](#sizeprops)
- [`GeometryProps`](#geometryprops)
- [Default Props](#default-props)
