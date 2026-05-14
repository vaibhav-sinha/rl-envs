<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-skipinvisibleinstancechildren -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- skipInvisibleInstanceChildren

On this page

When enabled, causes all node properties and methods to skip over invisible nodes (and their descendants) inside [`instances`](../InstanceNode.md).
This makes operations like document traversal much faster.

info

Defaults to true in Figma Dev Mode and false in Figma and FigJam

## Signature[​](#signature "Direct link to Signature")

### [skipInvisibleInstanceChildren](figma-skipinvisibleinstancechildren.md): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Accessing and modifying invisible nodes and their descendants inside instances can be slow with the plugin API.
This is especially true in large documents with tens of thousands of nodes where a call to [`findAll`](nodes-findall.md) might come across many of these invisible instance children.

If your plugin does not need access to these nodes, we recommend setting `figma.skipInvisibleInstanceChildren = true` as that often makes document traversal significantly faster.

When this flag is enabled, it will not be possible to access invisible nodes (and their descendants) inside instances. This has the following effects:

- [`children`](nodes-children.md) and methods such as [`findAll`](nodes-findall.md) will exclude these nodes.
- [`figma.getNodeByIdAsync`](../figma.md#getnodebyidasync) will return a promise containing null.
- [`figma.getNodeById`](../figma.md#getnodebyid) will return null.
- Accessing a property on an existing node object for an invisible node will throw an error.

For example, suppose that a portion of the document tree looks like this:

Frame (visible) → Instance (visible) → Frame (invisible) → Text (visible)

The last two frame and text nodes cannot be accessed after setting `figma.skipInvisibleInstanceChildren = true`.

The benefit of enabling this flag is that document traversal methods, [`findAll`](nodes-findall.md) and [`findOne`](nodes-findone.md), can be up to several times faster in large documents that have invisible instance children.
[`findAllWithCriteria`](nodes-findallwithcriteria.md) can be up to hundreds of times faster in large documents.

[Previous

mode](figma-mode.md)[Next

closePlugin](figma-closeplugin.md)

- [Signature](#signature)
- [Remarks](#remarks)
