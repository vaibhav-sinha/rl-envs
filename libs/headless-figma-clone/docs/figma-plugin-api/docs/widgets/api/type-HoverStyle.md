<!-- source: https://developers.figma.com/docs/widgets/api/type-HoverStyle -->

- Widgets
- Data Types
- HoverStyle

For more details about hover states see this guide: [Adding Hover States](../adding-hover-states.md).

```
interface HoverStyle {  
  fill?: HexCode | Color | Paint | (SolidPaint | GradientPaint)[]  
  stroke?: HexCode | Color | SolidPaint | GradientPaint | (SolidPaint | GradientPaint)[]  
  opacity?: number  
}
```

[Previous

GradientPaint](type-GradientPaint.md)[Next

ImagePaint](type-ImagePaint.md)
