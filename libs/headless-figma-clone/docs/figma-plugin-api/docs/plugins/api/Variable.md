<!-- source: https://developers.figma.com/docs/plugins/api/Variable -->

- Plugins
- [Data Types](data-types.md)
- Variables
- Variable

On this page

## Variable properties[​](#variable-properties "Direct link to Variable properties")

A `Variable` is a single design token that defines values for each of the modes in its [`VariableCollection`](VariableCollection.md). These values can be applied to various kinds of design properties and prototyping actions, enabling design token functionality and advanced prototyping flows.

Read more about variables in the [Guide to variables](https://help.figma.com/hc/en-us/articles/15339657135383).

### id: string [readonly]

The unique identifier of this variable.

---

### name: string

The name of this variable.

---

### description: string

Description of this variable.

---

### [hiddenFromPublishing](properties/Variable-hiddenfrompublishing.md): boolean

Whether this variable is hidden when publishing the current file as a library. Can only true if [`remote`](Variable.md#remote) is false (e.g. this is a local variable).

[View more →](properties/Variable-hiddenfrompublishing.md)

---

### getPublishStatusAsync(): Promise<[PublishStatus](PublishStatus.md)>

Returns the publishing status of this variable in the current file.

---

### remote: boolean [readonly]

Whether this variable is remote or local.

---

### variableCollectionId: string [readonly]

The ID of the collection that contains this variable.

---

### key: string [readonly]

The key to use with [`importVariableByKeyAsync`](properties/figma-variables-importvariablebykeyasync.md). Note that while this key is present on local and published variables, you can only import variables that are already published.

---

### resolvedType: [VariableResolvedDataType](VariableResolvedDataType.md) [readonly]

The resolved type of the variable.

---

### [resolveForConsumer](properties/Variable-resolveforconsumer.md)(consumer: [SceneNode](nodes.md#scene-node)): { value: [VariableValue](VariableValue.md); resolvedType: [VariableResolvedDataType](VariableResolvedDataType.md) }

Retrieves the resolved value for this variable if it was bound to `consumer`.

[View more →](properties/Variable-resolveforconsumer.md)

---

### setValueForMode(modeId: string, newValue: [VariableValue](VariableValue.md)): void

Sets the value of this variable for the provided mode. If the modeId belongs to an extended collection, the value will be overridden on the extension.

---

### valuesByMode: { [modeId: string]: [VariableValue](VariableValue.md) } [readonly]

The values for each mode of this variable. Note that this will not resolve any aliases. To return fully resolved values in all cases, consider using [`resolveForConsumer`](properties/Variable-resolveforconsumer.md).

---

### remove(): void

Removes this variable from the document.

---

### [scopes](properties/Variable-scopes.md): Array<[VariableScope](VariableScope.md)>

An array of scopes in the UI where this variable is shown. Setting this property will show/hide this variable in the variable picker UI for different fields.

[View more →](properties/Variable-scopes.md)

---

### codeSyntax: { [platform in [CodeSyntaxPlatform](CodeSyntaxPlatform.md#code-syntax-platform)]?: string} [readonly]

Code syntax definitions for this variable. Supported platforms are `'WEB'`, `'ANDROID'`, and `'iOS'`.

---

### [setVariableCodeSyntax](properties/Variable-setvariablecodesyntax.md)(platform: [CodeSyntaxPlatform](CodeSyntaxPlatform.md#code-syntax-platform), value: string): void

Add or modify a platform definition on [`codeSyntax`](Variable.md#codesyntax). Acceptable platforms are `'WEB'`, `'ANDROID'`, and `'iOS'`.

[View more →](properties/Variable-setvariablecodesyntax.md)

---

### removeVariableCodeSyntax(platform: [CodeSyntaxPlatform](CodeSyntaxPlatform.md#code-syntax-platform)): void

Remove a platform definition from [`codeSyntax`](Variable.md#codesyntax). Acceptable parameters are `'WEB'`, `'ANDROID'`, and `'iOS'` if previously defined.

---

### valuesByModeForCollectionAsync(collection: [VariableCollection](VariableCollection.md)): Promise<{ [modeId: string]: [VariableValue](VariableValue.md) }>

The overridden or inherited values for each mode for the provided collection that inherits this variable. Note that this will not resolve any aliases. To return fully resolved values in all cases, consider using [`resolveForConsumer`](properties/Variable-resolveforconsumer.md).

---

### removeOverrideForMode(extendedModeId: string): void

Removes the overridden value for the given mode if it exists and returns to the inherited value.

---

## Plugin data properties[​](#plugin-data-properties "Direct link to Plugin data properties")

### getPluginData(key: string): string

Retrieves custom information that was stored on this node or style using [`setPluginData`](properties/nodes-setplugindata.md). If there is no data stored for the provided key, an empty string is returned.

---

### [setPluginData](properties/nodes-setplugindata.md)(key: string, value: string): void

Lets you store custom information on any node or style, **private** to your plugin. The total size of your entry (`pluginId`, `key`, `value`) cannot exceed 100 kB.

[View more →](properties/nodes-setplugindata.md)

---

### getPluginDataKeys(): string[]

Retrieves a list of all keys stored on this node or style using using [`setPluginData`](properties/nodes-setplugindata.md). This enables iterating through all data stored privately on a node or style by your plugin.

---

### getSharedPluginData(namespace: string, key: string): string

Retrieves custom information that was stored on this node or style using [`setSharedPluginData`](properties/nodes-setsharedplugindata.md). If there is no data stored for the provided namespace and key, an empty string is returned.

---

### [setSharedPluginData](properties/nodes-setsharedplugindata.md)(namespace: string, key: string, value: string): void

Lets you store custom information on any node or style, **public** to all plugins. The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB.

[View more →](properties/nodes-setsharedplugindata.md)

---

### getSharedPluginDataKeys(namespace: string): string[]

Retrieves a list of all keys stored on this node or style using [`setSharedPluginData`](properties/nodes-setsharedplugindata.md). This enables iterating through all data stored in a given namespace.

---

[Previous

Vector](Vector.md)[Next

hiddenFromPublishing](properties/Variable-hiddenfrompublishing.md)

- [Variable properties](#variable-properties)
- [Plugin data properties](#plugin-data-properties)
