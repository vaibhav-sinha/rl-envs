<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-createvariable -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [variables](../figma-variables.md)
- createVariable

On this page

Creates a variable with a given name and resolved type inside a collection.

## Signature[​](#signature "Direct link to Signature")

### createVariable(name: string, collection: [VariableCollection](../VariableCollection.md), resolvedType: [VariableResolvedDataType](../VariableResolvedDataType.md)): [Variable](../Variable.md)

## Parameters[​](#parameters "Direct link to Parameters")

### name[​](#name "Direct link to name")

The name of the newly created variable

### collection[​](#collection "Direct link to collection")

A variable collection. Make sure to pass a collection object here; passing a collection ID is deprecated.

### resolvedType[​](#resolvedtype "Direct link to resolvedType")

The resolved type of this variable

[Previous

getLocalVariables](figma-variables-getlocalvariables.md)[Next

createVariableCollection](figma-variables-createvariablecollection.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [name](#name)
  - [collection](#collection)
  - [resolvedType](#resolvedtype)
