<!-- source: https://developers.figma.com/docs/plugins/api/TextStyle -->

- Plugins
- [Data Types](data-types.md)
- TextStyle

On this page

## TextStyle[​](#textstyle "Direct link to TextStyle")

### type: 'TEXT'

The string literal "TEXT" representing the style type. Always check the `type` before reading other properties.

---

### fontSize: number

Value to replace the text [`fontSize`](TextNode.md#fontsize) with.

---

### textDecoration: [TextDecoration](TextDecoration.md)

Value to replace the text [`textDecoration`](TextNode.md#textdecoration) with.

---

### fontName: [FontName](FontName.md)

Value to replace the text [`fontName`](TextNode.md#fontname) with.

---

### letterSpacing: [LetterSpacing](LetterSpacing.md)

Value to replace the text [`letterSpacing`](TextNode.md#letterspacing) with.

---

### lineHeight: [LineHeight](LineHeight.md)

Value to replace the text [`lineHeight`](TextNode.md#lineheight) with.

---

### leadingTrim: [LeadingTrim](LeadingTrim.md)

Value to replace the text [`leadingTrim`](TextNode.md#leadingtrim) with.

---

### paragraphIndent: number

Value to replace the text [`paragraphIndent`](TextNode.md#paragraphindent) with.

---

### paragraphSpacing: number

Value to replace the text [`paragraphSpacing`](TextNode.md#paragraphspacing) with.

---

### listSpacing: number

Value to replace the text [`listSpacing`](TextNode.md#listspacing) with.

---

### hangingPunctuation: boolean

Value to replace the text [`hangingPunctuation`](TextNode.md#hangingpunctuation) with.

---

### hangingList: boolean

Value to replace the text [`hangingList`](TextNode.md#hanginglist) with.

---

### textCase: [TextCase](TextCase.md)

Value to replace the text [`textCase`](TextNode.md#textcase) with.

---

### boundVariables?: { [field in [VariableBindableTextField](VariableBindableTextField.md)]?: [VariableAlias](VariableAlias.md)}

The variables bound to a particular field on this text style.

---

### setBoundVariable(field: [VariableBindableTextField](VariableBindableTextField.md), variable: [Variable](Variable.md) | null): void

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](../working-with-variables.md) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

[View more →](properties/TextStyle-setboundvariable.md)

---

## Base style properties[​](#base-style-properties "Direct link to Base style properties")

### id: string [readonly]

The unique identifier of the style in the document the plugin is executing from. You can assign this value via `setFillStyleIdAsync`, `setStrokeStyleIdAsync`, `setTextStyleIdAsync`, etc. to make the node properties reflect that of the style node.

---

### getStyleConsumersAsync(): Promise<[StyleConsumers](StyleConsumers.md)[]>

The consumers of this style. The `fields` in `StyleConsumers` refers to the field where the style is applied (e.g. a PaintStyle can be applied in `setFillStyleIdAsync` or `setStrokeStyleIdAsync`).

---

### consumers: [StyleConsumers](StyleConsumers.md)[] [readonly]

**DEPRECATED:** Use `getStyleConsumersAsync` instead. Accessing this property will throw an exception if the plugin manifest contains `"documentAccess": "dynamic-page"`.

The consumers of this style. The `fields` in `StyleConsumers` refers to the field where the style is applied (e.g. a PaintStyle can be applied in `setFillStyleIdAsync` or `setStrokeStyleIdAsync`).

---

### name: string

The name of the style node. Note that setting this also sets "autoRename" to false on [`TextNode`](TextNode.md).

---

### remove(): void

Deletes a local style.

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

## Publishable properties[​](#publishable-properties "Direct link to Publishable properties")

### [description](properties/nodes-description.md): string

The plain-text annotation entered by the user for this style/component.

[View more →](properties/nodes-description.md)

---

### [descriptionMarkdown](properties/nodes-descriptionmarkdown.md): string

The rich-text annotation entered by the user for this style/component.

[View more →](properties/nodes-descriptionmarkdown.md)

---

### [documentationLinks](properties/nodes-documentationlinks.md): ReadonlyArray<[DocumentationLink](DocumentationLink.md)>

The documentation links for this style/component.

[View more →](properties/nodes-documentationlinks.md)

---

### remote: boolean [readonly]

Whether this style/component is a remote style/component that doesn't live in the file (i.e. is from the team library). Remote components are read-only: attempts to change their properties will throw.

---

### key: string [readonly]

The key to use with [`figma.importComponentByKeyAsync`](figma.md#importcomponentbykeyasync), [`figma.importComponentSetByKeyAsync`](figma.md#importcomponentsetbykeyasync) and [`figma.importStyleByKeyAsync`](figma.md#importstylebykeyasync). Note that while this key is present on local and published components, you can only import components that are already published.

---

### getPublishStatusAsync(): Promise<[PublishStatus](PublishStatus.md)>

Gets the status of this style/component in the team library.

---

## Folders[​](#folders "Direct link to Folders")

Styles can be put inside folders (including nested folders) by setting the name of the style to be a delimited path name.
For example, the following code would move a paint style named `Style 1` into a nested folder named `b`. Folder `b` resides in folder `a`.

```
const style = figma.createPaintStyle()   
style.name = "a/b/Style 1"
```

Folder names cannot be empty strings and they are unique within the same hierarchy. Since two nested folders can have the same name when residing in
different parent folders, we refer to folders by their absolute delimited folder name. The following function `getNamePrefix` can be used
to get the absolute folder name given a style name.

```
const getNameParts = (name: string) => {  
  const nameParts = name.split('/').filter((part: string) => !!part)  
  return nameParts.map((part: string) => part.trim())  
}  
  
const getNamePrefix = (name: string): string => {  
  const pathParts = getNameParts(name)  
  pathParts.pop()  
  return pathParts.join('/')  
}
```

[Previous

PaintStyle](PaintStyle.md)

- [TextStyle](#textstyle)
- [Base style properties](#base-style-properties)
- [Plugin data properties](#plugin-data-properties)
- [Publishable properties](#publishable-properties)
- [Folders](#folders)
