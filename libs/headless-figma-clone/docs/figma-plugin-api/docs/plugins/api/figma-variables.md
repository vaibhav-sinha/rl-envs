<!-- source: https://developers.figma.com/docs/plugins/api/figma-variables -->

- Plugins
- [Global Objects](global-objects.md)
- [figma](figma.md)
- variables

These are all defined on `figma.variables`. Please see the [Working with Variables](../working-with-variables.md) guide for how to use these functions to interact with variables in Figma.

### getVariableByIdAsync(id: string): Promise<[Variable](Variable.md) | null>

Finds a variable by ID. If not found or the provided ID is invalid, returns a promise containing `null`.

[View more →](properties/figma-variables-getvariablebyidasync.md)

---

### getVariableById(id: string): [Variable](Variable.md) | null

**DEPRECATED:** Use [`getVariableByIdAsync`](properties/figma-variables-getvariablebyidasync.md) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable by ID. If not found or the provided ID is invalid, returns `null`.

[View more →](properties/figma-variables-getvariablebyid.md)

---

### getVariableCollectionByIdAsync(id: string): Promise<[VariableCollection](VariableCollection.md) | null>

Finds a variable collection by ID. If not found or the provided ID is invalid, returns a promise containing `null`.

[View more →](properties/figma-variables-getvariablecollectionbyidasync.md)

---

### getVariableCollectionById(id: string): [VariableCollection](VariableCollection.md) | null

**DEPRECATED:** Use [`getVariableCollectionByIdAsync`](properties/figma-variables-getvariablecollectionbyidasync.md) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Finds a variable collection by ID. If not found or the provided ID is invalid, returns `null`.

[View more →](properties/figma-variables-getvariablecollectionbyid.md)

---

### getLocalVariablesAsync(type?: [VariableResolvedDataType](VariableResolvedDataType.md)): Promise<[Variable](Variable.md)[]>

Returns all local variables in the current file, optionally filtering by resolved type.

[View more →](properties/figma-variables-getlocalvariablesasync.md)

---

### getLocalVariables(type?: [VariableResolvedDataType](VariableResolvedDataType.md)): [Variable](Variable.md)[]

**DEPRECATED:** Use [`getLocalVariablesAsync`](properties/figma-variables-getlocalvariablesasync.md) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns all local variables in the current file, optionally filtering by resolved type.

[View more →](properties/figma-variables-getlocalvariables.md)

---

### getLocalVariableCollectionsAsync(): Promise<[VariableCollection](VariableCollection.md)[]>

Returns all local variable collections in the current file.

---

### getLocalVariableCollections(): [VariableCollection](VariableCollection.md)[]

**DEPRECATED:** Use [`getLocalVariableCollectionsAsync`](figma-variables.md#getlocalvariablecollectionsasync) instead. This function will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

Returns all local variable collections in the current file.

---

### createVariable(name: string, collection: [VariableCollection](VariableCollection.md), resolvedType: [VariableResolvedDataType](VariableResolvedDataType.md)): [Variable](Variable.md)

Creates a variable with a given name and resolved type inside a collection.

[View more →](properties/figma-variables-createvariable.md)

---

### createVariableCollection(name: string): [VariableCollection](VariableCollection.md)

Creates a new variable collection with the given name.

[View more →](properties/figma-variables-createvariablecollection.md)

---

### extendLibraryCollectionByKeyAsync(collectionKey: string, name: string): Promise<[ExtendedVariableCollection](ExtendedVariableCollection.md)>

Creates a new extended variable collection from a library or local variable collection with the given name.

[View more →](properties/figma-variables-extendlibrarycollectionbykeyasync.md)

---

### createVariableAlias(variable: [Variable](Variable.md)): [VariableAlias](VariableAlias.md)

Helper function to create a variable alias.

This should be used with functions such as `node.setProperties()` to
assign component properties to variables.

---

### createVariableAliasByIdAsync(variableId: string): Promise<[VariableAlias](VariableAlias.md)>

Helper function to create a variable alias.

This should be used with functions such as `node.setProperties()` to
assign component properties to variables.

---

### setBoundVariableForPaint(paint: [SolidPaint](Paint.md#solid-paint), field: [VariableBindablePaintField](VariableBindablePaintField.md), variable: [Variable](Variable.md) | null): [SolidPaint](Paint.md#solid-paint)

Helper function to bind a variable to a [`SolidPaint`](Paint.md).

If `null` is provided as the `variable`, the given `field` will be unbound from any variables.

---

### setBoundVariableForEffect(effect: [Effect](Effect.md), field: [VariableBindableEffectField](VariableBindableEffectField.md), variable: [Variable](Variable.md) | null): [Effect](Effect.md)

Helper function to bind a variable to an [`Effect`](Effect.md).

If `null` is provided as the `variable`, the given `field` will be unbound from any variables.

---

### setBoundVariableForLayoutGrid(layoutGrid: [LayoutGrid](LayoutGrid.md), field: [VariableBindableLayoutGridField](VariableBindableLayoutGridField.md), variable: [Variable](Variable.md) | null): [LayoutGrid](LayoutGrid.md)

Helper function to bind a variable to a [`LayoutGrid`](LayoutGrid.md).

If `null` is provided as the `variable`, the given `field` will be unbound from any variables.

---

### importVariableByKeyAsync(key: string): Promise<[Variable](Variable.md)>

Loads a variable from the team library. Promise is rejected if there is
no published variable with that key or if the request fails.

[View more →](properties/figma-variables-importvariablebykeyasync.md)

---

[Previous

payments](figma-payments.md)[Next

getVariableByIdAsync](properties/figma-variables-getvariablebyidasync.md)
