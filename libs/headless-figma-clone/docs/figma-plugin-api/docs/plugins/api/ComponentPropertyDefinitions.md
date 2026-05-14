<!-- source: https://developers.figma.com/docs/plugins/api/ComponentPropertyDefinitions -->

- Plugins
- [Data Types](data-types.md)
- ComponentPropertyDefinitions

```
type ComponentPropertyDefinitions = {  
  [propertyName: string]: {  
    type: ComponentPropertyType  
    defaultValue: string | boolean  
    variantOptions?: string[]  
    preferredValues?: InstanceSwapPreferredValue[]  
    description?: string  
    readonly boundVariables?: {  
      [field in VariableBindableComponentPropertyDefinitionField]?: VariableAlias  
    }  
  }  
}  
  
type VariableBindableComponentPropertyDefinitionField = "defaultValue"
```

A map of component property definitions that exist on a component or component set node. Each definition in the map must have a type matching [`ComponentPropertyType`](ComponentPropertyType.md). `defaultValue` represents the value that instances will initially have for that property. `'VARIANT'` properties also have `variantOptions`, a list of possible values for that variant property. `'INSTANCE_SWAP'` properties may optionally have a list of [`InstanceSwapPreferredValue`](InstanceSwapPreferredValue.md)s. A component property can optionally be bound to a [`Variable`](Variable.md), in which case the `boundVariables` structure will be populated with a [`VariableAlias`](VariableAlias.md) describing the variable controlling this property. Only Slot properties can have a `description` property.

[Previous

ComponentProperties](ComponentProperties.md)[Next

ComponentPropertyOptions](ComponentPropertyOptions.md)
