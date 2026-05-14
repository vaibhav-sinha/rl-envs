<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-register -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- register

On this page

Used to register your widget. **This is the main entry point to widgets.**

This function expects a widget function that describes the widget and returns a Figma element
(eg. one of the components AutoLayout, Frame, Text etc).

## Signature[​](#signature "Direct link to Signature")

### [register](widget-register.md)(component: FunctionalWidget<any>): void

## Remarks[​](#remarks "Direct link to Remarks")

The provided function will be called any time a widget is inserted and anytime the widget’s state is updated.

caution

The `widget.register` function should only be called once when the `manifest.main` file runs.

### Usage Example[​](#usage-example "Direct link to Usage Example")

First widget

```
const { widget } = figma  
const { Text } = widget  
  
function MyFirstWidget() {  
  return <Text>Hello Widget</Text>  
}  
  
widget.register(MyFirstWidget)
```

[Previous

figma.widget](../figma-widget.md)[Next

useSyncedState](widget-usesyncedstate.md)

- [Signature](#signature)
- [Remarks](#remarks)
  - [Usage Example](#usage-example)
