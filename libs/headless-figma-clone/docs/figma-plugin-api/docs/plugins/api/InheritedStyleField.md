<!-- source: https://developers.figma.com/docs/plugins/api/InheritedStyleField -->

- Plugins
- [Data Types](data-types.md)
- InheritedStyleField

```
type InheritedStyleField =  
  | 'fillStyleId'  
  | 'strokeStyleId'  
  | 'backgroundStyleId'  
  | 'textStyleId'  
  | 'effectStyleId'  
  | 'gridStyleId'  
  | 'strokeStyleId'
```

A [StyleConsumer](StyleConsumers.md) will have this style applied in one of these style fields. Note that not every style type can be applied to every style field. For example, a PaintStyle can be applied in `fillStyleId` or `strokeStyleId`, but not in `textStyleId`.

[Previous

InferredAutoLayoutResult](InferredAutoLayoutResult.md)[Next

InstanceSwapPreferredValue](InstanceSwapPreferredValue.md)
