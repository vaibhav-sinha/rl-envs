<!-- source: https://developers.figma.com/docs/plugins/api/properties/PageNode-off -->

- Plugins
- [Node Types](../nodes.md)
- [PageNode](../PageNode.md)
- off

On this page

Removes a callback added with [`on`](PageNode-on.md) or [`once`](../PageNode.md#once).

Supported on:

- [PageNode](../PageNode.md)

## Signature[​](#signature "Direct link to Signature")

### [off](PageNode-off.md)(type: 'nodechange', callback: (event: [NodeChangeEvent](../NodeChangeEvent.md)) => void): void

## Remarks[​](#remarks "Direct link to Remarks")

The callback needs to be the same object that was originally added. For example, you can do this:

Correct way to remove a callback

```
let fn = () => { console.log("nodechange") }  
page.on("nodechange", fn)  
page.off("nodechange", fn)
```

whereas the following won't work, because the function objects are different:

Incorrect way to remove a callback

```
page.on("nodechange", () => { console.log("nodechange") })  
page.off("nodechange", () => { console.log("nodechange") })
```

[Previous

on](PageNode-on.md)[Next

focusedSlide](PageNode-focusedslide.md)

- [Signature](#signature)
- [Remarks](#remarks)
