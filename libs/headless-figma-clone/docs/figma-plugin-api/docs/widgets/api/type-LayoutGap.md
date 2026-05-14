<!-- source: https://developers.figma.com/docs/widgets/api/type-LayoutGap -->

- Widgets
- Data Types
- LayoutGap

```
interface LayoutGap {  
  /**  
   * The horizontal gap between auto-layout children.  
   *  
   * `"auto"` is the same as `justify-content: space-between` in css.  
   */  
  horizontal?: number | 'auto'  
  
  /**  
   * The vertical gap between auto-layout children.  
   *  
   * `"auto"` is the same as `align-content: space-between` in css.  
   */  
  vertical?: number | 'auto'  
}
```

[Previous

ImagePaint](type-ImagePaint.md)[Next

Padding](type-Padding.md)
