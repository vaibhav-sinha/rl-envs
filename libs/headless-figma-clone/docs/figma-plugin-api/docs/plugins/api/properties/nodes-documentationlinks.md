<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-documentationlinks -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- documentationLinks

On this page

The documentation links for this style/component.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EffectStyle](../EffectStyle.md)
- [GridStyle](../GridStyle.md)
- [PaintStyle](../PaintStyle.md)
- [TextStyle](../TextStyle.md)

## Signature[​](#signature "Direct link to Signature")

### [documentationLinks](nodes-documentationlinks.md): ReadonlyArray<[DocumentationLink](../DocumentationLink.md)>

## Remarks[​](#remarks "Direct link to Remarks")

This API currently only supports setting a single documentation link. To clear the documentation links, set to the empty list [].

Example:

```
node.documentationLinks = [{uri: "https://www.figma.com"}]  
  
// clear documentation links  
node.documentationLinks = []
```

[Previous

descriptionMarkdown](nodes-descriptionmarkdown.md)[Next

editDevResourceAsync](nodes-editdevresourceasync.md)

- [Signature](#signature)
- [Remarks](#remarks)
