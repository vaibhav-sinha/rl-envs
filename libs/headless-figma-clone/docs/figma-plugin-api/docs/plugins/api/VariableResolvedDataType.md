<!-- source: https://developers.figma.com/docs/plugins/api/VariableResolvedDataType -->

- Plugins
- [Data Types](data-types.md)
- Variables
- VariableResolvedDataType

```
type VariableResolvedDataType =  
  "BOOLEAN" |  
  "COLOR" |  
  "FLOAT" |  
  "STRING"
```

The list of resolved [`Variable`](Variable.md) types that Figma current supports.

- `"BOOLEAN"` variables can be assigned to `true` or `false`
- `"COLOR"` variables can be assigned to [`RGB`](RGB.md) values
- `"FLOAT"` variables can be assigned to `number` values
- `"STRING"` variables can be assigned to `string` values

Since a variable can be assigned to a [`VariableAlias`](VariableAlias.md) for any given mode, this type refers to the type of the fully resolved value (after following all aliases).

[Previous

VariableBindableColorStopField](VariableBindableColorStopField.md)[Next

VariableScope](VariableScope.md)
