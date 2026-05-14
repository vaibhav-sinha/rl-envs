<!-- source: https://developers.figma.com/docs/widgets/api/type-Effect -->

- Widgets
- Data Types
- Effect

On this page

Figma has four types of effects:

![](https://static.figma.com/uploads/9def6cce093b164306328ee228028155d13d72d0)

These are split into 3 types:

```
type Effect =  
  | DropShadowEffect  
  | InnerShadowEffect  
  | BlurEffect
```

## `DropShadowEffect`[​](#dropshadoweffect "Direct link to dropshadoweffect")

```
interface DropShadowEffect {  
  type: 'drop-shadow'  
  color: HexCode | Color  
  offset: Vector  
  blur: number  
  blendMode?: BlendMode  
  spread?: number  
  visible?: boolean  
  showShadowBehindNode?: boolean  
}
```

### type: 'drop-shadow'

The type of the shadow.

---

### color: HexCode | [Color](type-Color.md#color)

The color of the shadow, including its opacity.

---

### offset: Vector

The offset of the shadow relative to its object. Use this property to simulate the direction of the light.

---

### blur: number

The blur radius of the shadow. Must be >= 0. A lower radius creates a sharper shadow.

---

### blendMode?: [BlendMode](type-BlendMode.md#blend-mode)

Determines how the color of this shadow blends with the colors underneath it.

---

### spread?: number

The distance by which to expand (or contract) the shadow. For drop shadows, a positive spread value creates a shadow larger than the node, whereas a negative value creates a shadow smaller than the node. For inner shadows, a positive `spread` value contracts the shadow. Additionally, `spread` values are only accepted on rectangles, ellipses, frames, components, and instances with visible fill paints and `clipsContent` enabled. When left unspecified, the default value is 0.

---

### visible?: boolean

Whether this shadow is visible.

---

### showShadowBehindNode?: boolean

Whether the drop shadow should show behind translucent or transparent pixels within the node's geometry. Defaults to `true`.

---

### Example Usage[​](#example-usage "Direct link to Example Usage")

Drop Shadow

```
const { widget } = figma  
const { Frame } = widget  
  
function DropShadowExample() {  
  return (  
    <Frame  
      effect={{  
        type: "drop-shadow",  
        color: "#00000040",  
        offset: {  
          x: 4,  
          y: 4,  
        },  
        blur: 4,  
      }}  
      fill="#FFF"  
      width={100}  
      height={100}  
    />  
  )  
}  
  
widget.register(DropShadowExample)
```

## `InnerShadowEffect`[​](#innershadoweffect "Direct link to innershadoweffect")

```
interface InnerShadowEffect {  
  type: 'inner-shadow'  
  color: HexCode | Color  
  offset: Vector  
  blur: number  
  blendMode?: BlendMode  
  spread?: number  
  visible?: boolean  
}
```

### type: 'inner-shadow'

The type of the shadow.

---

### color: HexCode | [Color](type-Color.md#color)

The color of the shadow, including its opacity.

---

### offset: Vector

The offset of the shadow relative to its object. Use this property to simulate the direction of the light.

---

### blur: number

The blur radius of the shadow. Must be >= 0. A lower radius creates a sharper shadow.

---

### blendMode?: [BlendMode](type-BlendMode.md#blend-mode)

Determines how the color of this shadow blends with the colors underneath it.

---

### spread?: number

The distance by which to expand (or contract) the shadow. For drop shadows, a positive spread value creates a shadow larger than the node, whereas a negative value creates a shadow smaller than the node. For inner shadows, a positive `spread` value contracts the shadow. Additionally, `spread` values are only accepted on rectangles, ellipses, frames, components, and instances with visible fill paints and `clipsContent` enabled. When left unspecified, the default value is 0.

---

### visible?: boolean

Whether this shadow is visible.

---

### Example Usage[​](#example-usage-1 "Direct link to Example Usage")

Inner Shadow

```
const { widget } = figma  
const { Frame } = widget  
  
function InnerShadowExample() {  
  return (  
    <Frame  
      effect={{  
        type: "inner-shadow",  
        color: "#00000040",  
        offset: {  
          x: 4,  
          y: 4,  
        },  
        blur: 4,  
      }}  
      fill="#FFF"  
      width={100}  
      height={100}  
    />  
  )  
}  
  
widget.register(InnerShadowExample)
```

## `BlurEffect`[​](#blureffect "Direct link to blureffect")

```
interface BlurEffect {  
  type: 'layer-blur' | 'background-blur'  
  blur: number  
  visible?: boolean  
}
```

### type: 'layer-blur' | 'background-blur'

The type of the blur.

---

### blur: number

The blur radius of the shadow. Must be >= 0. A lower radius creates a sharper shadow.

---

### visible?: boolean

Whether this shadow is visible.

---

### Example Usage[​](#example-usage-2 "Direct link to Example Usage")

Inner Shadow

```
const { widget } = figma  
const { Frame } = widget  
  
function BlurExample() {  
  return (  
    <Frame  
      effect={{  
        blur: 4,  
        type: "layer-blur",  
      }}  
      fill="#FFF"  
      width={100}  
      height={100}  
    />  
  )  
}  
  
widget.register(BlurExample)
```

[Previous

CornerRadius](type-CornerRadius.md)[Next

FontWeight](type-FontWeight.md)

- [`DropShadowEffect`](#dropshadoweffect)
  - [Example Usage](#example-usage)
- [`InnerShadowEffect`](#innershadoweffect)
  - [Example Usage](#example-usage-1)
- [`BlurEffect`](#blureffect)
  - [Example Usage](#example-usage-2)
