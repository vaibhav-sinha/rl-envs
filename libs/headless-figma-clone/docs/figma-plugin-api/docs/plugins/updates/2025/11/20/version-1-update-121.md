<!-- source: https://developers.figma.com/docs/plugins/updates/2025/11/20/version-1-update-121 -->

## Extended variable collections (Enterprise only)[​](#extended-variable-collections-enterprise-only "Direct link to Extended variable collections (Enterprise only)")

**Extended variable collections** enable theming for variables. When you extend a collection, the extension inherits all modes and variables from its parent collection. You can then override variable values in the extended collection to create theme-specific variations while maintaining a single source of truth.

### New type[​](#new-type "Direct link to New type")

- [`ExtendedVariableCollection`](../../../../api/ExtendedVariableCollection.md): A variable collection that extends another collection

### New methods[​](#new-methods "Direct link to New methods")

- [`figma.variables.extendLibraryCollectionByKeyAsync(collectionKey, name)`](../../../../api/figma-variables.md#extendlibrarycollectionbykeyasync): Create an extended collection from a library or local variable collection
- [`variableCollection.extend(name)`](../../../../api/VariableCollection.md#extend): Create an extended collection from a local variable collection
- [`variable.valuesByModeForCollectionAsync(collection)`](../../../../api/Variable.md#valuesbymodeforcollectionasync): Get variable values for a specific collection, including overrides in extended collections
- [`variable.removeOverrideForMode(extendedModeId)`](../../../../api/Variable.md#removeoverrideformode): Remove an override for a specific mode
- [`extendedVariableCollection.removeOverridesForVariable(variableId)`](../../../../api/ExtendedVariableCollection.md#removeoverridesforvariable): Remove all overrides for a variable

### New properties[​](#new-properties "Direct link to New properties")

- [`extendedVariableCollection.variableOverrides`](../../../../api/ExtendedVariableCollection.md#variableoverrides): A map of all overridden variable values in the extended collection
- `mode.parentModeId`: For modes in extended collections, references the corresponding mode in the parent collection

### Updated behavior[​](#updated-behavior "Direct link to Updated behavior")

- [`variable.setValueForMode(modeId, value)`](../../../../api/Variable.md#setvalueformode): When the `modeId` belongs to an extended collection, the value will be set as an override on the extension

For examples and more details, see [Working with Variables](../../../../working-with-variables.md#extended-variable-collections).

[Newer post

Version 1, Update 122](../../../2026/01/14/version-1-update-122.md)[Older post

Version 1, Update 120](../06/version-1-update-120.md)
