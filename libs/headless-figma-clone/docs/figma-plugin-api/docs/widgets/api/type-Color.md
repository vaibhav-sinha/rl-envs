<!-- source: https://developers.figma.com/docs/widgets/api/type-Color -->

- Widgets
- Data Types
- Color

On this page

```
interface Color {  
  r: number  
  g: number  
  b: number  
  a: number  
}
```

Represents a full Figma color value. These values are from 0 to 1. For example black is `{r: 0, g: 0, b: 0, a: 1}` and white is `{r: 1, g: 1, b: 1, a: 1}`.

All colors are specified in the same color space. This color space is sRGB in modern browsers and in the Figma desktop app is either sRGB or unmanaged depending on [how you have it configured](https://www.figma.com/blog/figma-desktop-app-improvements/#you-can-now-manage-your-color-space). Unmanaged means the color space is whatever the current color space is of your display.

## HexCode[​](#hexcode "Direct link to HexCode")

We also use the following type alias in our documentation to refer to a hex color string. Eg. "#FFFFFF".

```
type HexCode = string
```

[Previous

BlendMode](type-BlendMode.md)[Next

Constraint](type-Constraint.md)

- [HexCode](#hexcode)
