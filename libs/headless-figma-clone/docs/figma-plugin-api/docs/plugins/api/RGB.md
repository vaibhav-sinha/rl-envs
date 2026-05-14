<!-- source: https://developers.figma.com/docs/plugins/api/RGB -->

- Plugins
- [Data Types](data-types.md)
- RGB/RGBA

```
interface RGBA {  
  // "Red"  
  readonly r: number  
  // "Green"  
  readonly g: number  
  // "Blue"  
  readonly b: number  
  // "Alpha" or "opacity"  
  readonly a: number  
}
```

Represents a full Figma color value. These values are from 0 to 1. For example black is `{r: 0, g: 0, b: 0, a: 1}` and white is `{r: 1, g: 1, b: 1, a: 1}`.

```
interface RGB {  
  readonly r: number  
  readonly g: number  
  readonly b: number  
}
```

Represents a color just like RGBA but without an alpha value. This is only used for [`SolidPaint`](Paint.md). Colors normally have an alpha value but all paints have an opacity value so alpha was redundant for [`SolidPaint`](Paint.md).

Figma supports [color management](https://help.figma.com/hc/en-us/articles/360039825114). All colors are specified in the same color space which will be the color profile of the document, [`documentColorProfile`](DocumentNode.md#documentcolorprofile).

[Previous

Rect](Rect.md)[Next

RunEvent](RunEvent.md)
