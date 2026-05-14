<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-getlocalvariables -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [variables](../figma-variables.md)
- getLocalVariables

On this page

**DEPRECATED:** Use [`getLocalVariablesAsync`](figma-variables-getlocalvariablesasync.md) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns all local variables in the current file, optionally filtering by resolved type.

## Signature[​](#signature "Direct link to Signature")

### getLocalVariables(type?: [VariableResolvedDataType](../VariableResolvedDataType.md)): [Variable](../Variable.md)[]

## Parameters[​](#parameters "Direct link to Parameters")

### type[​](#type "Direct link to type")

Filters the returned variables to only be of the given resolved type.

[Previous

getLocalVariablesAsync](figma-variables-getlocalvariablesasync.md)[Next

createVariable](figma-variables-createvariable.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [type](#type)
