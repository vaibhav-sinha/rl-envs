<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-usestickablehost -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- useStickableHost

On this page

info

This API is only available in FigJam

`useStickableHost` lets your widget run a callback when a stickable is added or removed to your widget. By default all widgets are already stickable hosts so you don't have to call this if you just want stamps to stick to your widget.

## Signature[​](#signature "Direct link to Signature")

### [useStickableHost](widget-usestickablehost.md)(onAttachmentsChanged?: (e: [WidgetAttachedStickablesChangedEvent](../type-WidgetAttachedStickablesChangedEvent.md#widget-attached-stickables-changed-event)) => void | Promise<void>): void

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `onAttachedStickablesChanged` | An optional callback that is called whenever stickables are added or removed from this widget. It takes a **[`WidgetAttachedStickablesChangedEvent`](../type-WidgetAttachedStickablesChangedEvent.md)** as an argument. |

## Remarks[​](#remarks "Direct link to Remarks")

### Example[​](#example "Direct link to Example")

This widget is a rectangle that you can stamps in and it will display how many of each stamp type are present on the widget.

Stamp Vote with useStickableHost

```
function StampVote() {  
  const [votes, setVotes] = useSyncedState("votes", {});  
  const widgetID = useWidgetId();  
  
  useStickableHost(() => {  
    const widget = figma.getNodeById(widgetID);  
    if (!widget) {  
      return;  
    }  
    const newVotes: { [key: string]: number } = {};  
    const { stuckNodes } = widget;  
    for (const node of stuckNodes) {  
      if (!node || node.type !== "STAMP") {  
        continue;  
      }  
  
      newVotes[node.name] = newVotes[node.name] || 0;  
      newVotes[node.name] += 1;  
    }  
  
    setVotes(newVotes);  
  });  
  
  return (  
    <AutoLayout  
      fill={"#FFFFFF"}  
      stroke={"#E6E6E6"}  
      padding={16}  
      direction="vertical"  
      width={300}  
      height={300}  
      verticalAlignItems="end"  
    >  
      {Object.keys(votes).map((name) => (  
        <Text>  
          {name}: {votes[name]}  
        </Text>  
      ))}  
    </AutoLayout>  
  );  
}
```

### Other Rules[​](#other-rules "Direct link to Other Rules")

- In FigJam a node is either a stickable or a stickable host, but never both.
- You cannot call `useStickable` and `useStickableHost` in the same render of a widget; it can only be one or the other.
- By default all widgets are stickable hosts and can let stamps and other stickables stick to them.
- Calling `useStickableHost` doesn't let non stickables attach to your widget.

[Previous

useStickable](widget-usestickable.md)[Next

waitForTask](widget-waitfortask.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
  - [Example](#example)
  - [Other Rules](#other-rules)
