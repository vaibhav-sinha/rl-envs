<!-- source: https://developers.figma.com/docs/plugins/api/properties/PageNode-guides -->

- Plugins
- [Node Types](../nodes.md)
- [PageNode](../PageNode.md)
- guides

On this page

The guides on this page.

Supported on:

- [PageNode](../PageNode.md)

## Signature[​](#signature "Direct link to Signature")

### [guides](PageNode-guides.md): ReadonlyArray<[Guide](../Guide.md)>

## Remarks[​](#remarks "Direct link to Remarks")

Like many of our array properties, `page.guide` creates a new, read-only array every time it is called. To change the guides, you will need to make a copy of the existing array and/or assign a new array.

Example:

```
function addNewGuide(page: PageNode, guide: Guide) {  
  // .concat() creates a new array  
  page.guides = page.guides.concat(guide)  
}
```

[Previous

PageNode](../PageNode.md)[Next

selection](PageNode-selection.md)

- [Signature](#signature)
- [Remarks](#remarks)
