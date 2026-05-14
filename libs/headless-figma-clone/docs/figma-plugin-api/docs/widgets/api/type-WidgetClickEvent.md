<!-- source: https://developers.figma.com/docs/widgets/api/type-WidgetClickEvent -->

- Widgets
- Data Types
- WidgetClickEvent

Parameter passed to onClick callbacks. See also: [Handling User Events](../handling-user-events.md).

```
type WidgetClickEvent = {  
  canvasX: number  
  canvasY: number  
  offsetX: number  
  offsetY: number  
}
```

### canvasX: number

canvasX is the x position of the mouse relative to the canvas.
This is the same as the absolute position that is used to position a node.

---

### canvasY: number

canvasY is the y position of the mouse relative to the canvas.
This is the same as the absolute position that is used to position a node.

---

### offsetX: number

offsetX is the X coordinate of the mouse relative to the component
that was clicked.

---

### offsetY: number

offsetY is the Y coordinate of the mouse relative to the component
that was clicked.

---

[Previous

Transform](type-Transform.md)[Next

WidgetStuckEvent](type-WidgetStuckEvent.md)
