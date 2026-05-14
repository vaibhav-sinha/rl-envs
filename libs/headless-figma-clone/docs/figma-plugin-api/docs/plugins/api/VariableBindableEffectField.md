<!-- source: https://developers.figma.com/docs/plugins/api/VariableBindableEffectField -->

- Plugins
- [Data Types](data-types.md)
- Variables
- VariableBindableEffectField

```
type VariableBindableShadowEffectField =  
  'radius' |  
  'color' |  
  'spread' |  
  'offsetX' |  
  'offsetY'  
  
type VariableBindableBlurEffectField = 'radius'  
  
type VariableBindableEffectField =  
  VariableBindableShadowEffectField  
  | VariableBindableBlurEffectField
```

A list of node fields that can be bound to a [`Effect`](Effect.md) by type.

[Previous

VariableBindablePaintField](VariableBindablePaintField.md)[Next

VariableBindableLayoutGridField](VariableBindableLayoutGridField.md)
