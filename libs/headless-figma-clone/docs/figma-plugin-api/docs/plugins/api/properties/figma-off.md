<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-off -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- off

On this page

Removes a callback added with `figma.on` or `figma.once`.

## Signature[​](#signature "Direct link to Signature")

### [off](figma-off.md)(type: [ArgFreeEventType](figma-on.md#arg-free-event-type), callback: () => void): void

### [off](figma-off.md)(type: 'run', callback: (event: [RunEvent](../RunEvent.md)) => void): void

### [off](figma-off.md)(type: 'drop', callback: (event: [DropEvent](../DropEvent.md)) => boolean): void

### [off](figma-off.md)(type: 'documentchange', callback: (event: [DocumentChangeEvent](../DocumentChangeEvent.md)) => void): void

### [off](figma-off.md)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](../SlidesViewChangeEvent.md)) => void): void

### [off](figma-off.md)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](../CanvasViewChangeEvent.md)) => void): void

### [off](figma-off.md)(type: 'textreview', callback: (event: [TextReviewEvent](../TextReviewEvent.md)) => Promise<[TextReviewRange](../TextReviewRange.md)[]> | [TextReviewRange](../TextReviewRange.md)[]): void

### [off](figma-off.md)(type: 'stylechange', callback: (event: [StyleChangeEvent](../StyleChangeEvent.md)) => void): void

## Remarks[​](#remarks "Direct link to Remarks")

The callback needs to be the same object that was originally added. For example, you can do this:

Correct way to remove a callback

```
let fn = () => { console.log("selectionchanged") }  
figma.on("selectionchange", fn)  
figma.off("selectionchange", fn)
```

whereas the following won't work, because the function objects are different:

Incorrect way to remove a callback

```
figma.on("selectionchange", () => { console.log("selectionchanged") })  
figma.off("selectionchange", () => { console.log("selectionchanged") })
```

[Previous

on](figma-on.md)[Next

mixed](figma-mixed.md)

- [Signature](#signature)
- [Remarks](#remarks)
