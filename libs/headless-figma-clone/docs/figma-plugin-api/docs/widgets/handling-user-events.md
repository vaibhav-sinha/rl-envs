<!-- source: https://developers.figma.com/docs/widgets/handling-user-events -->

- Widgets
- Development Guides
- Handling User Events

On this page

There are many ways a user can interact with a widget:

- [Click listeners](#click-listeners)
- [Property menus](#property-menus)
- [Text Editing](text-editing.md)
- [iFrames](#iframes)
- [Stickable Hooks](#stickable-hooks)
  - [Making a Widget Stickable](#making-a-widget-stickable)
  - [Making a Widget a Stickable Host](#making-a-widget-a-stickable-host)
- [Hover States](adding-hover-states.md)

## Click listeners[​](#click-listeners "Direct link to Click listeners")

![onclick](data:image/gif;base64,dmVyc2lvbiBodHRwczovL2dpdC1sZnMuZ2l0aHViLmNvbS9zcGVjL3YxCm9pZCBzaGEyNTY6ZTc3OTk4NGIwMDM1YzllZDhjNGYzNDc3NGVkODVmMDQ3YWFjZDk2YTBmMzk3YjdjNmM1YmQ0YzM2NzAxZDA1YwpzaXplIDM0NDg2Cg==)

Widget are able to register event listeners that respond to user events. For now, we only support `click` events on nodes inside the widget

Here’s an example of a widget that writes to the JavaScript console on click

Simple click handler

```
const { widget } = figma  
const { Text } = widget  
  
function ConsoleWidget() {  
  return <Text onClick={() => console.log('Hey!')}>Click me</Text>  
}  
  
widget.register(ConsoleWidget)
```

When a user clicks on a widget, we run the function passed to the `onClick` prop and terminate the widget thereafter. However there are cases where it might be useful keep the widget running for longer. An example of this is if your click handler opens an iframe to get additional input from the user.

We want to keep the widget running as long as the iframe is open, to enable this type of long-lived event handlers, we also support `async` callbacks to indicate that the Widget shouldn’t be terminated immediately.

Here’s an example that using async / await in a click handler:

Async click handler

```
const { widget } = figma  
const { Text } = widget  
  
function AsyncClickWidget() {  
  return (  
    <Text  
      onClick={async () => {  
        const fonts = await figma.listAvailableFontsAsync()  
        // Do stuff  
      }}  
    >  
      Click me  
    </Text>  
  )  
}  
  
widget.register(AsyncClickWidget)
```

If your callback returns a promise, your widget will only be terminated once the promise has been resolved, or when `figma.closePlugin()` is called.

Returning a promise in click handler

```
const { widget } = figma  
const { Text } = widget  
  
function PromiseWidget() {  
  return (  
    <Text  
      onClick={() =>  
        new Promise((resolve) => {  
          setTimeout(() => {  
            console.log('This is a delayed action')  
            resolve(null)  
          }, 1000)  
        })  
      }  
    >  
      Click me  
    </Text>  
  )  
}  
  
widget.register(PromiseWidget)
```

In the above example the onClick handlers that we passed into our components didn't take any arguments. The function that you pass to the onClick prop can take
an argument provides information about where the user clicked on the screen.

Click coordinates in click handler

```
const { widget } = figma  
const { Frame } = widget  
  
function XYWidget() {  
  return (  
    <Frame  
      width={200}  
      height={200}  
      fill="#f00"  
      onClick={(event) => {  
        // offsetX and offsetY are useful for getting the position of the  
        // mouse relative to the component that was clicked. You could use  
        // these coordinates to position something inside of the frame.  
        console.log('offset coords:', event.offsetX, event.offsetY)  
  
        // canvasX and canvasY are relative to the canvas itself.  
        // You can use these to position objects outside of  
        // the widget relative to the canvas.  
        console.log('canvas coords:', event.canvasX, event.canvasY)  
      }}  
    />  
  )  
}  
widget.register(XYWidget)
```

## Property menus[​](#property-menus "Direct link to Property menus")

![Property menu](/assets/images/widget_property_menu-6c38e8d52bc63b92f3bd558c18372088.png)

A property menu is an optional menu that can be shown when you select your widget. We recommend using property menus only when there are secondary actions that cannot be done directly on the widget, such as formatting and settings.

Here's an example of a widget that shows a property menu with two items:

Simple property menu

```
const { widget } = figma  
const { Text, usePropertyMenu } = widget  
  
function PropertyMenuExample() {  
  usePropertyMenu(  
    [  
      {  
        tooltip: 'One',  
        propertyName: 'one',  
        itemType: 'action',  
      },  
      {  
        tooltip: 'Two',  
        propertyName: 'two',  
        itemType: 'action',  
      },  
    ],  
    (e) => {  
      console.log(e.propertyName)  
    },  
  )  
  
  return <Text>Select Me</Text>  
}  
  
widget.register(PropertyMenuExample)
```

For more information, refer to the documentation on [usePropertyMenu](api/properties/widget-usepropertymenu.md).

## iFrames[​](#iframes "Direct link to iFrames")

![Widget iFrame](data:image/gif;base64,dmVyc2lvbiBodHRwczovL2dpdC1sZnMuZ2l0aHViLmNvbS9zcGVjL3YxCm9pZCBzaGEyNTY6YjJjMzJkYTMwM2ZlMWZkYjJiNDRhM2EyZWQ3OTcwZTZlMWEzMzQ3Y2RkZTJjMDkyNDFhMGFhODhkOTA1MTQwMQpzaXplIDIxMzczMAo=)

For more complex input methods (such as a textbox), you can open an iFrame window to receive the input.

info

For more information on setting up a separate `ui.html` page, refer to the [Creating a User Interface](../plugins/creating-ui.md) guide from the plugin docs.

In `code.tsx`, the iFrame html is setup in-line of the `figma.showUI()` method, where the value of the textbox is sent to the parent.

Setting up the `figma.ui.onmessage` handler inside of `useEffect()` will ensure that the handler is set when the widget mounts. In this example, the name received from the iFrame is used to update the `name` state in the widget. Once the name has been set, the iFrame is closed by calling [`figma.closePlugin()`](../plugins/api/properties/figma-closeplugin.md).

Using iframes in widgets

```
const { widget } = figma  
const { Text, useSyncedState, useEffect } = widget  
  
function IFrameExample() {  
  const [name, setName] = useSyncedState('name', '[Enter your name]')  
  useEffect(() => {  
    figma.ui.onmessage = (message) => {  
      if (message.type === 'name') {  
        setName(message.name)  
        figma.closePlugin()  
      }  
    }  
  })  
  
  return (  
    <Text  
      onClick={() => {  
        return new Promise((resolve) => {  
          figma.showUI(`  
            <input id="name" type="text" placeholder="Name">  
            <button id="submit">Submit</button>  
            <script>  
              document.getElementById('submit').onclick = () => {  
                const textbox = document.getElementById('name')  
                const name = textbox.value  
                const message = { pluginMessage: {type: 'name', name} }  
                parent.postMessage(message, '*')  
              }  
            </script>  
        `)  
        })  
      }}  
    >  
      Hello {name}  
    </Text>  
  )  
}  
  
widget.register(IFrameExample)
```

## Stickable Hooks[​](#stickable-hooks "Direct link to Stickable Hooks")

In FigJam a **stickable** is any node that sticks to other nodes when put on top of them. Currently FigJam has two built-in stickables: `STAMP` and `HIGHLIGHT` nodes. In addition you can now define a `WIDGET` node as being stickable if it uses the [`useStickable`](api/properties/widget-usestickable.md) hook.

Your widget can either be **stickable** and stick to other nodes like stamps or it can be a **stickable host** and allow stickables to stick to it.

It should be noted that your widget can either be a **stickable** or a **stickable host** but not both.

### Making a Widget Stickable[​](#making-a-widget-stickable "Direct link to Making a Widget Stickable")

If a widget is declared as a stickable it will attach itself to all other non stickables in the document. When your widget node is "stuck" to another node it will move along with the element it is attached to unless the stickable is dragged off of its stickable host.

In this example below you can see that the widget sticks to this sticky note when dragged over top of it.

![Example of useStickable](data:image/gif;base64,dmVyc2lvbiBodHRwczovL2dpdC1sZnMuZ2l0aHViLmNvbS9zcGVjL3YxCm9pZCBzaGEyNTY6MWVmNmQ5YWFiNDk1NmRhMThiMzdhOGM3YjkxMTc5NGFiMTJlNzhlNTE2MTVlZDE0MDUxZjFiYWE3ZTAxYmM4ZgpzaXplIDMwOTI1MAo=)

To make a widget a **stickable** you can use the [`useStickable`](api/properties/widget-usestickable.md). hook.

### Making a Widget a Stickable Host[​](#making-a-widget-a-stickable-host "Direct link to Making a Widget a Stickable Host")

If a widget is a stickable host that means that stickables are allowed to attach themselves to that widget. By default all widgets are stickable hosts unless they call [`useStickable`](api/properties/widget-usestickable.md).. This means that out of the box, stamps and highlights will stick to your widget.

If you would like your widget to run code when you stick something to it you can use the [`useStickableHost`](api/properties/widget-usestickablehost.md). hook to define a callback that should run when a stickable is attached to it.

info

Note that calling [`useStickableHost`](api/properties/widget-usestickablehost.md). will not make any nodes other than stamp, highlight, and stickable widget nodes stick to your widget.

Below you can see an example of a widget that uses [`useStickableHost`](api/properties/widget-usestickablehost.md). to count the number of attached stamps when a new stamp is stuck to it.

![Example of useStickableHost](data:image/gif;base64,dmVyc2lvbiBodHRwczovL2dpdC1sZnMuZ2l0aHViLmNvbS9zcGVjL3YxCm9pZCBzaGEyNTY6YjBiMjM4OTQ3MDZkZjZlMmIzYjliNDliYWMxMjQ1NTFiZDZhZmMyNTNjY2E3YjJkOGVkZGExYTIwMWY2N2E1YQpzaXplIDE4NDUzMQo=)

[Previous

Widget State & Multiplayer](widget-state-and-multiplayer.md)[Next

Making Network Requests](making-network-requests.md)

- [Click listeners](#click-listeners)
- [Property menus](#property-menus)
- [iFrames](#iframes)
- [Stickable Hooks](#stickable-hooks)
  - [Making a Widget Stickable](#making-a-widget-stickable)
  - [Making a Widget a Stickable Host](#making-a-widget-a-stickable-host)
