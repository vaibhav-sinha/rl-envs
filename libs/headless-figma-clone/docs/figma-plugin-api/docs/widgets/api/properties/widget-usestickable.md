<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-usestickable -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- useStickable

On this page

info

This API is only available in FigJam

`useStickable` is a hook that makes your widget stick to other nodes when dragged over them. This behavior is similar to how stamp nodes work in Figma.

## Signature[​](#signature "Direct link to Signature")

### [useStickable](widget-usestickable.md)(onStuckStatusChanged?: (e: [WidgetStuckEvent](../type-WidgetStuckEvent.md#widget-stuck-event)) => void | Promise<void>): void

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `onStuckStatusChanged` | An optional callback that is called whenever a widget is stuck or removed from a node. It takes a **[`WidgetStuckEvent`](../type-WidgetStuckEvent.md)** as an argument. |

## Remarks[​](#remarks "Direct link to Remarks")

### Basic Usage[​](#basic-usage "Direct link to Basic Usage")

useStickable without callback

```
const { useStickable, Rectangle } = figma.widget;  
function Widget() {  
  // This widget sticks to other nodes now!  
  useStickable();  
  return <Rectangle width={100} height={100} fill="#F00" />;  
}  
figma.widget.register(Widget);
```

![Gif of widget sticking to a sticky note](data:image/gif;base64,dmVyc2lvbiBodHRwczovL2dpdC1sZnMuZ2l0aHViLmNvbS9zcGVjL3YxCm9pZCBzaGEyNTY6MWVmNmQ5YWFiNDk1NmRhMThiMzdhOGM3YjkxMTc5NGFiMTJlNzhlNTE2MTVlZDE0MDUxZjFiYWE3ZTAxYmM4ZgpzaXplIDMwOTI1MAo=)

### Example[​](#example "Direct link to Example")

This example changes the color of the widget depending on what type of node it is stuck to.

useStickable with callback

```
const { useStickable, Rectangle, useWidgetId, useSyncedState } = figma.widget;  
function Widget() {  
  const widgetId = useWidgetId();  
  const [color, setColor] = useSyncedState("color", "#000");  
  
  // This widget sticks to other nodes now!  
  useStickable(() => {  
    const widget = figma.getNodeById(widgetId);  
    const { stuckTo } = widget;  
    if (!stuckTo) {  
      // Set the color to black if the widget isn't stuck to anything.  
      setColor("#000");  
      return;  
    }  
  
    switch (stuckTo.type) {  
      case "STICKY":  
        // Make the widget red if we are attacked to a sticky  
        setColor("#F00");  
        return;  
      case "SHAPE_WITH_TEXT":  
        // Make the widget green if we are attached to a shape with text  
        setColor("#0F0");  
        return;  
      default:  
        // If we are attached to anything else make the widget blue  
        setColor("#00F");  
        return;  
    }  
  });  
  
  return <Rectangle width={100} height={100} fill={color} />;  
}  
figma.widget.register(Widget);
```

### Other Rules[​](#other-rules "Direct link to Other Rules")

- In FigJam a node is either a stickable or a stickable host, but never both.
- You cannot call `useStickable` and `useStickableHost` in the same render of a widget; it can only be one or the other.
- By default all widgets are stickable hosts and can let stamps and other stickables stick to them.

[Previous

useEffect](widget-useeffect.md)[Next

useStickableHost](widget-usestickablehost.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
  - [Basic Usage](#basic-usage)
  - [Example](#example)
  - [Other Rules](#other-rules)
