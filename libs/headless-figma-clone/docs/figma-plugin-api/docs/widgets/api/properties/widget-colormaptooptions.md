<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-colormaptooptions -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- colorMapToOptions

On this page

info

This API is only available in FigJam

The `colorMapToOptions` takes in a [ColorPalette](../../../plugins/api/ColorPalette.md), a map from color names to values, and returns `WidgetPropertyMenuColorSelectorOption[]`. This helper function enables developers to use `figma.constants.colors.*`, official FigJam color palettes, in the `PropertyMenu`.

## Signature[​](#signature "Direct link to Signature")

### [colorMapToOptions](widget-colormaptooptions.md)(colorPalette: { [key: string]: string }): WidgetPropertyMenuColorSelectorOption[]

## Remarks[​](#remarks "Direct link to Remarks")

### Usage Example:[​](#usage-example "Direct link to Usage Example:")

colorMapToOptions example

```
const { widget } = figma  
const { colorMapToOptions, useSyncedState, usePropertyMenu, Text } = widget  
  
function colorPaletteExample() {  
  const [color, setColor] = useSyncedState("theme", figma.constants.colors.figJamBase.black)  
  usePropertyMenu(  
    [  
      {  
        itemType: 'color-selector',  
        propertyName: 'colors',  
        tooltip: 'Color selector',  
        selectedOption: color,  
        options: [  
          ...figma.widget.colorMapToOptions(figma.constants.colors.figJamBase)  
          {option: '#f5427b', tooltip: 'Hot Pink'}  
        ],  
      },  
    ],  
    ({propertyName, propertyValue}) => {  
      if (propertyName === "colors") {  
        setColor(propertyValue)  
      }  
    },  
  )  
  return (  
    <Text fill={color}>  
      String(color)  
    </Text>  
  )  
}  
  
widget.register(colorPaletteExample)
```

[Previous

useWidgetId](widget-usewidgetid.md)[Next

AutoLayout](../component-AutoLayout.md)

- [Signature](#signature)
- [Remarks](#remarks)
  - [Usage Example:](#usage-example)
