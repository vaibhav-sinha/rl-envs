<!-- source: https://developers.figma.com/docs/plugins/api/ComponentProperties -->

- Plugins
- [Data Types](data-types.md)
- ComponentProperties

```
type ComponentProperties = {  
  [propertyName: string]: {  
    type: ComponentPropertyType  
    value: string | boolean  
    preferredValues?: InstanceSwapPreferredValue[]  
    readonly boundVariables?: {  
      [field in VariableBindableComponentPropertyField]?: VariableAlias  
    }  
  }  
}  
  
type VariableBindableComponentPropertyField = "value"
```

A map of component properties that exist on an instance node. Each property in the map must have a type matching [`ComponentPropertyType`](ComponentPropertyType.md). A component property can optionally be bound to a [`Variable`](Variable.md), in which case the `boundVariables` structure will be populated with a [`VariableAlias`](VariableAlias.md) describing the variable controlling this property.

[Previous

Constraints](Constraints.md)[Next

ComponentPropertyDefinitions](ComponentPropertyDefinitions.md)
