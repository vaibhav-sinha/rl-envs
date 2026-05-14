<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-waitfortask -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- waitForTask

On this page

The `waitForTask` function is useful for doing asynchronous work (eg. data fetching) in `useEffect`. It takes a promise and keeps the widget alive until the promise is resolved (or if there’s an explicit call to `figma.closePlugin`).

## Signature[​](#signature "Direct link to Signature")

### [waitForTask](widget-waitfortask.md)(task: Promise<any>): void

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `task` | The widget will only be terminated when the given task is resolved |

## Remarks[​](#remarks "Direct link to Remarks")

One of the main use cases of `waitForTask` is doing data fetching when a widget is inserted onto the canvas. When paired with `useEffect`, you can make a network request via an iframe and persist the response in a widget state. The `waitForTask` call will prevent the widget from being terminated until the given promise has resolved.

### Usage Example:[​](#usage-example "Direct link to Usage Example:")

waitForTask example

```
const { widget } = figma  
const { Text, useEffect, waitForTask, useSyncedState } = widget  
  
function WaitForTaskExample() {  
  const [textContent, setTextContent] = useSyncedState("text", "Initial")  
  
  useEffect(() => {  
    waitForTask(new Promise(resolve => {  
      // Simulate async work  
      setTimeout(() => {  
        if (textContent !== "Final") {  
          setTextContent("Final")  
        }  
        // Resolve the task  
        resolve()  
      }, 1000)  
    }))  
  })  
  
  return <Text>{textContent}</Text>  
}  
  
widget.register(WaitForTaskExample)
```

[Previous

useStickableHost](widget-usestickablehost.md)[Next

useWidgetId](widget-usewidgetid.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
  - [Usage Example:](#usage-example)
