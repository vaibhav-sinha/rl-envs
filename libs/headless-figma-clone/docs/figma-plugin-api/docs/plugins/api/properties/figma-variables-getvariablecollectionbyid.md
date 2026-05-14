<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-variables-getvariablecollectionbyid -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [variables](../figma-variables.md)
- getVariableCollectionById

On this page

**DEPRECATED:** Use [`getVariableCollectionByIdAsync`](figma-variables-getvariablecollectionbyidasync.md) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable collection by ID. If not found or the provided ID is invalid, returns `null`.

## Signature[​](#signature "Direct link to Signature")

### getVariableCollectionById(id: string): [VariableCollection](../VariableCollection.md) | null

## Parameters[​](#parameters "Direct link to Parameters")

### id[​](#id "Direct link to id")

The variable collection ID to search for, which represents a unique identifier for the variable collection.

[Previous

getVariableCollectionByIdAsync](figma-variables-getvariablecollectionbyidasync.md)[Next

getLocalVariablesAsync](figma-variables-getlocalvariablesasync.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [id](#id)
