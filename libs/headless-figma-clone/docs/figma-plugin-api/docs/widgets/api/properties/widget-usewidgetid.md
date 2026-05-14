<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-usewidgetid -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- useWidgetId

On this page

The `useWidgetId` hook gives you a way to reference the active widget node in event handlers like `onClick`. It returns a node `id` which can be used to retrieve and identify the active WidgetNode via the plugin API (eg. `figma.getNodeById`).

## Signature[​](#signature "Direct link to Signature")

### [useWidgetId](widget-usewidgetid.md)(): string

## Remarks[​](#remarks "Direct link to Remarks")

caution

Note that `figma.getNodeById` shouldn’t be called when rendering a widget (this will throw an error). Instead, this should be used inside event handlers where using the plugin API is allowed. See the [Rendering Code](../../how-widgets-run.md#rendering-code) for more details.

### Usage Example[​](#usage-example "Direct link to Usage Example")

useWidgetId example

```
const { widget } = figma  
const { Text, useWidgetId } = widget  
  
function UseWidgetIdExample() {  
  const widgetId = useWidgetId()  
  
  return (  
    <Text  
      onClick={() => {  
        const widgetNode = figma.getNodeById(widgetId) as WidgetNode;  
        const clonedWidget = widgetNode.clone();  
  
        // Position the cloned widget beside this widget  
        widgetNode.parent!.appendChild(clonedWidget);  
        clonedWidget.x = widgetNode.x + widgetNode.width + 50;  
        clonedWidget.y = widgetNode.y;  
      }}  
    >  
      Make a copy  
    </Text>  
  )  
}  
  
widget.register(UseWidgetIdExample)
```

[Previous

waitForTask](widget-waitfortask.md)[Next

colorMapToOptions](widget-colormaptooptions.md)

- [Signature](#signature)
- [Remarks](#remarks)
  - [Usage Example](#usage-example)
