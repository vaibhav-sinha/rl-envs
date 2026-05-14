<!-- source: https://developers.figma.com/docs/widgets/using-the-plugin-api -->

- Widgets
- Basics of Widgets
- Using the Plugin API

As you probably already figured out, the widget API and [plugin API](../plugins.md) are very much related and meant to be used together when building widgets.

The plugin API can only be used in event handlers and hooks.

You can think of this model as:

1. The Widget API is an interface to describing what goes on the canvas
2. The Plugin API is an interface to manipulate things on the canvas

Consequently, you might find that your widget code looks very much like the following pseudocode:

Using the Plugin API

```
const { widget } = figma  
const { AutoLayout, Text, useWidgetId } = widget  
  
function AverageWidget() {  
  const widgetId = useWidgetId()  
  
  return (  
    // Use the Widget JSX API here to describe how to render the widget!  
    <AutoLayout  
      onClick={() => {  
  
        // Use Plugin API here in response to user interactions!  
        const widgetNode = await figma.getNodeByIdAsync(widgetId) as WidgetNode  
  
      }}  
    >  
      <Text>Hello</Text>  
    </AutoLayout>  
  )  
}  
  
widget.register(AverageWidget)
```

[Previous

Prototyping Widget UI](prototyping-widget-ui.md)[Next

Working with Widgets](working-with-widgets.md)
