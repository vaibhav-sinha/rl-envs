<!-- source: https://developers.figma.com/docs/widgets/api/component-Image -->

- Widgets
- Component Types
- Image

On this page

An `Image` is essentially syntactic sugar for a [`Rectangle`](component-Rectangle.md) with an image fill. Instead of the fill prop, it has a `src` prop, that can be either a URL string or an ImagePaint. If a URL string is passed that will be used to create an ImagePaint.

## Usage Example[​](#usage-example "Direct link to Usage Example")

Usage example

```
<Image  
  // Pass a data uri directly as the image  
  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAECSURBVHgBpY87TwJBFIXPnVkhbqQQE7UQNWhrsdpLI40FsdSYGGNvbWFhZ2Jj+AWER0fFD6CAhhYCod8GGmCLJRAI2Rl22LDh1RBOc1/fzb0H2EK0WPSfzj+lxG3wMIpAOKpaZfpPpddgKxG510BllSsw6MGAEAYl0zWVMn+L8boEzOXD0oRwrI1vZF9ESRetWO94XMjEDwxb0xttTF6txyNbzbU5mHmWhhtiQ3aGSkQmTH129YJLunJjdQned9DshkbF8d7o4cRiOSB0475ld+JUnTM+/Pb1d0p8ck2eKXN49/OOFfkGOXfCLnjpdamNDfLhgfFdIyE+GOg3AJHHrpoC5YtKfAfixH0AAAAASUVORK5CYII="  
  
  width={100}  
  height={100}  
/>
```

### src: string | [ImagePaint](type-ImagePaint.md#image-paint)

A string representing Image URL/DataURI or an ImagePaint.

---

## `SizeProps` (Required)[​](#sizeprops-required "Direct link to sizeprops-required")

### width: [Size](type-Size.md#size)

The width of the component. This is required.

---

### height: [Size](type-Size.md#size)

The height of the component. This is required.

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

## `CornerProps`[​](#cornerprops "Direct link to cornerprops")

### cornerRadius?: [CornerRadius](type-CornerRadius.md#corner-radius)

The number of pixels to round the corners of the object by.

This value must be non-negative and can be fractional. If an edge length is less than twice the corner radius, the corner radius for each vertex of the edge will be clamped to half the edge length.

info

Rectangle nodes can also have different corner radii on each of the four corners.

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

| Prop | Default |
| --- | --- |
| `name` | `""` |
| `hidden` | `false` |
| `x` | `0` |
| `y` | `0` |
| `blendMode` | `"pass-through"` |
| `opacity` | `1` |
| `effect` | `[]` |
| `stroke` | `[]` |
| `strokeWidth` | `1` |
| `strokeAlign` | `"inside"` |
| `rotation` | `0` |
| `cornerRadius` | `0` |

[Previous

Rectangle](component-Rectangle.md)[Next

Ellipse](component-Ellipse.md)

- [Usage Example](#usage-example)
- [`SizeProps` (Required)](#sizeprops-required)
- [`CornerProps`](#cornerprops)
- [`GeometryProps`](#geometryprops)
- [`BaseProps`](#baseprops)
  - [`BlendProps`](#blendprops)
  - [`ConstraintProps`](#constraintprops)
- [Default Props](#default-props)
