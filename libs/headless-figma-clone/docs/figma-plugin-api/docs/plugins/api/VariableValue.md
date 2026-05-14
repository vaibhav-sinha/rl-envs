<!-- source: https://developers.figma.com/docs/plugins/api/VariableValue -->

- Plugins
- [Data Types](data-types.md)
- Variables
- VariableValue

On this page

```
type VariableValue =  
  string |  
  number |  
  boolean |  
  RGB |  
  RGBA |  
  VariableAlias
```

## Variable Alias[​](#variable-alias "Direct link to Variable Alias")

Created via `figma.variables.createVariableBinding()`. Used to alias variables to other variables. Each `VariableValue` has at least one corresponding [`VariableResolvedDataType`](VariableResolvedDataType.md).

[Previous

VariableScope](VariableScope.md)[Next

setBoundVariable](properties/TextStyle-setboundvariable.md)

- [Variable Alias](#variable-alias)
