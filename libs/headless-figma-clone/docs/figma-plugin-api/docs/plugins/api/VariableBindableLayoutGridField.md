<!-- source: https://developers.figma.com/docs/plugins/api/VariableBindableLayoutGridField -->

- Plugins
- [Data Types](data-types.md)
- Variables
- VariableBindableLayoutGridField

```
// if pattern is set to 'ROWS' or 'COLUMNS' then alignment can be 'MIN', 'MAX', 'CENTER', or 'STRETCH'  
type VariableBindableRowColumnMinMaxLayoutField =  
  'sectionSize' |  
  'count' |  
  'offset' |  
  'gutterSize'  
  
type VariableBindableRowColumnCenterLayoutField =  
  'sectionSize' |  
  'count' |  
  'gutterSize'  
  
type VariableBindableRowColumnStretchLayoutField =  
  'count' |  
  'offset' |  
  'gutterSize'  
  
// if pattern is set to 'GRID' then a variable can only be bound to 'sectionSize'  
type VariableBindableGridLayoutField = 'sectionSize'  
  
type VariableBindableLayoutGridField =  
  VariableBindableRowColumnMinMaxLayoutField  
  | VariableBindableRowColumnCenterLayoutField  
  | VariableBindableRowColumnStretchLayoutField  
  | VariableBindableGridLayoutField
```

A list of node fields that can be bound to a [`LayoutGrid`](LayoutGrid.md) according to the combination of [`pattern`](LayoutGrid.md#pattern) and [`alignment`](LayoutGrid.md#alignment).

[Previous

VariableBindableEffectField](VariableBindableEffectField.md)[Next

VariableBindablePaintStyleField](VariableBindablePaintStyleField.md)
