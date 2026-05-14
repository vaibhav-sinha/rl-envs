<!-- source: https://developers.figma.com/docs/plugins/api/AnnotationProperty -->

- Plugins
- [Data Types](data-types.md)
- AnnotationProperty

```
interface AnnotationProperty {  
  readonly type: AnnotationPropertyType  
}  
  
type AnnotationPropertyType =  
  | 'width'  
  | 'height'  
  | 'maxWidth'  
  | 'minWidth'  
  | 'maxHeight'  
  | 'minHeight'  
  | 'fills'  
  | 'strokes'  
  | 'effects'  
  | 'strokeWeight'  
  | 'cornerRadius'  
  | 'textStyleId'  
  | 'textAlignHorizontal'  
  | 'fontFamily'  
  | 'fontStyle'  
  | 'fontSize'  
  | 'fontWeight'  
  | 'lineHeight'  
  | 'letterSpacing'  
  | 'itemSpacing'  
  | 'padding'  
  | 'layoutMode'  
  | 'alignItems'  
  | 'opacity'  
  | 'mainComponent'  
  | 'gridRowGap'  
  | 'gridColumnGap'  
  | 'gridRowCount'  
  | 'gridColumnCount'  
  | 'gridRowAnchorIndex'  
  | 'gridColumnAnchorIndex'  
  | 'gridRowSpan'  
  | 'gridColumnSpan'
```

A property pinned in an [Annotation](Annotation.md).

[Previous

AnnotationCategoryColor](AnnotationCategoryColor.md)[Next

ArcData](ArcData.md)
