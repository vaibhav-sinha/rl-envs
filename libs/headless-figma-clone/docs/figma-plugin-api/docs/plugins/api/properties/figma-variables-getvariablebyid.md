<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-getvariablebyid -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [variables](../figma-variables.md)
- getVariableById

On this page

**DEPRECATED:** Use [`getVariableByIdAsync`](figma-variables-getvariablebyidasync.md) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable by ID. If not found or the provided ID is invalid, returns `null`.

## Signature[​](#signature "Direct link to Signature")

### getVariableById(id: string): [Variable](../Variable.md) | null

## Parameters[​](#parameters "Direct link to Parameters")

### id[​](#id "Direct link to id")

The variable ID to search for, which represents a unique identifier for the variable.

[Previous

getVariableByIdAsync](figma-variables-getvariablebyidasync.md)[Next

getVariableCollectionByIdAsync](figma-variables-getvariablecollectionbyidasync.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [id](#id)
