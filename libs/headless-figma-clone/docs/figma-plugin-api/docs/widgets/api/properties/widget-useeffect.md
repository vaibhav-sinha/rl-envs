<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-useeffect -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- useEffect

On this page

The `useEffect` hook can be useful for running code that should run anytime the state of a widget changes or a widget is interacted with. You can use it to do data fetching when a component mounts (by using it with `waitForTask` ) or keeping state in sync between an iframe and the widget.

## Signature[​](#signature "Direct link to Signature")

### [useEffect](widget-useeffect.md)(effect: () => (() => void) | void): void

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `effect` | A function that is executed whenever a widget's state is updated. If a function is returned by this function, the returned function will be called prior to running effects again. |

info

Note: Because of [How Widgets Run](../../how-widgets-run.md), this function should handle being called multiple times with the same state.

## Remarks[​](#remarks "Direct link to Remarks")

There are three main use cases of `useEffect`:

**Initializing network or plugin API-dependent widget state**

[Rendering code](../../how-widgets-run.md#rendering-code) is synchronous and should only depend on widget state - if you wish to initialize widget state using information from the network (eg. HTTP requests in an iframe) or using information about the file (eg. using `figma.currentPage.selection`) - you can do this in `useEffect`. After the widget has rendered for the first time, any callback to `useEffect` is executed. Code in the function passed to `useEffect` is able to update widget state and perform asynchronous tasks (when paired with `waitForTask`).

**Setting up event handlers**

You might have multiple calls to `figma.showUI` in various event handler (eg. `onClick` on various nodes or via `usePropertyMenu` actions) and want to consolidate message handling in one place. `useEffect` is a great place for this. Effects are guaranteed to have run before any event handler code is executed and after a widget re-renders (eg. in response to state changes).

useEffect with figma.ui.onmessage

```
const { widget } = figma  
const { Text, useEffect, waitForTask } = widget  
  
function EventHandlerExample() {  
  useEffect(() => {  
    waitForTask(new Promise(resolve => {  
      figma.ui.onmessage = (msg) => {  
        console.log(msg)  
        resolve()  
      }  
    }))  
  })  
  
  return <Text>Event handler example</Text>  
}  
  
widget.register(EventHandlerExample)
```

info

Note: `useEffect` is called **every time** a widget's state is changed. This means that if you are setting up an event listener using [`figma.on`](../../../plugins/api/properties/figma-on.md) (or [`figma.ui.on`](../../../plugins/api/properties/figma-ui-on.md)), you need to make sure to remove the listener using the corresponding `off` function in the function returned by your `useEffect` callback. Not removing an event listener can lead to unexpected behavior where your code responds to an event multiple times.

Here's an example of how to use `useEffect` to set up an event handler and
clean it up when the widget is unmounted. In this example, we're using
figma.on("selectionchange") to render the number of selected nodes as part
of the widget.

useEffect with figma.on('selectionchange')

```
const { widget } = figma  
const { Text, useEffect, waitForTask, useSyncedState } = widget  
  
function EventHandlerExample() {  
  const [numNodes, setNumNodes] = useSyncedState('count', () => {  
    return figma.currentPage.selection.length  
  })  
  useEffect(() => {  
    let resolvePromise;  
    const onSelectionChange = () => {  
      setNumNodes(figma.currentPage.selection.length)  
      resolvePromise?.()  
    }  
    waitForTask(new Promise(resolve => {  
      resolvePromise = resolve;  
      figma.on('selectionchange', onSelectionChange)  
    }))  
    return () => {  
      figma.off('selectionchange', onSelectionChange)  
    }  
  })  
  
  return <Text>Number of selected nodes: {numNodes}</Text>  
}  
  
widget.register(EventHandlerExample)
```

**Consolidating state updating side-effects**

Because `useEffect` callbacks are run whenever a widget state changes - they are good candidates for performing any side-effects. This is especially useful if you have multiple functions in your widget that might update a widget's state and you want to consistently trigger the same side-effects based the final widget's state.

## Usage Example[​](#usage-example "Direct link to Usage Example")

useEffect example

```
const { widget } = figma  
const { Text, useEffect } = widget  
  
function UseEffectExample() {  
  useEffect(() => {  
    console.log("useEffect callback called")  
  })  
  
  return <Text>useEffect example</Text>  
}  
  
widget.register(UseEffectExample)
```

[Previous

usePropertyMenu](widget-usepropertymenu.md)[Next

useStickable](widget-usestickable.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
- [Usage Example](#usage-example)
