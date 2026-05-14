<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createcomponent -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createComponent

On this page

info

This API is only available in Figma Design

Creates a new, empty component.

## Signature[​](#signature "Direct link to Signature")

### [createComponent](figma-createcomponent.md)(): [ComponentNode](../ComponentNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has width and height both at 100, and is parented under `figma.currentPage`.

This function creates a brand new component. To create a component from an existing node, use [`figma.createComponentFromNode`](figma-createcomponentfromnode.md).

Create a component

```
const component = figma.createComponent()
```

[Previous

createAutoLayout](figma-createautolayout.md)[Next

createComponentFromNode](figma-createcomponentfromnode.md)

- [Signature](#signature)
- [Remarks](#remarks)
