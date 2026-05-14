<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-usepropertymenu -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- usePropertyMenu

On this page

The `usePropertyMenu` hook lets you specify the property menu to show when the widget is selected (See image below).

## Signature[​](#signature "Direct link to Signature")

### [usePropertyMenu](widget-usepropertymenu.md)(items: [WidgetPropertyMenuItem](../type-PropertyMenu.md#widget-property-menu-item)[], onChange: (event: [WidgetPropertyEvent](../type-PropertyMenu.md#widget-property-event)) => void | Promise<void>): void

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `items` | A list of `WidgetPropertyMenuItem`s to render when the widget is clicked |
| `onChange` | The function to call when a menu item is clicked. This function is called with an object containing the `propertyName` of the item that was clicked on. |

## Remarks[​](#remarks "Direct link to Remarks")

When building your widget, the property menu is a way to provide a menu for your widget. When a user clicks on the property menu, the associated callback is triggered.

![PropertyMenuExample](https://static.figma.com/uploads/e6970d5f4851a4875387f0ec8f41c35a9f7c538c)

### Usage Example[​](#usage-example "Direct link to Usage Example")

usePropertyMenu example

```
const { widget } = figma  
const { useSyncedState, usePropertyMenu, AutoLayout, Text } = widget  
  
function PropertyMenuWidget() {  
  const [color, setColor] = useSyncedState("theme", "#e06666")  
  const [fruit, setFruit] = useSyncedState("fruit", "mango")  
  const fruitOptions = [{option: "mango", label: "Mango"}, {option: "apple", label: "Apple"}]  
  usePropertyMenu(  
    [  
     {  
        itemType: 'action',  
        tooltip: 'Action',  
        propertyName: 'action',  
      },  
      {  
        itemType: 'separator',  
      },  
      {  
        itemType: 'color-selector',  
        propertyName: 'colors',  
        tooltip: 'Color selector',  
        selectedOption: color,  
        options: [{option: "#e06666", tooltip: "Red"}, {option: "#ffe599", tooltip: "Yellow"} ],  
      },  
      {  
        itemType: 'dropdown',  
        propertyName: 'fruits',  
        tooltip: 'Fruit selector',  
        selectedOption: fruit,  
        options: fruitOptions,  
      },  
      {  
        itemType: 'link',  
        propertyName: 'fruitLink',  
        tooltip: 'Learn about fruit!',  
        icon: null,  
        href: 'https://en.wikipedia.org/wiki/Fruit',  
      },  
    ],  
    ({propertyName, propertyValue}) => {  
      if (propertyName === "colors") {  
        setColor(propertyValue)  
      } else if (propertyName === "fruits") {  
        setFruit(propertyValue)  
      } else if (propertyName === "action") {  
        console.log(propertyName)  
      }  
    },  
  )  
  return (  
    <AutoLayout  
      verticalAlignItems={'center'}  
      padding={16}  
    >  
      <Text fontSize={32} width={200} horizontalAlignText={'center'} fill={color}>  
        {fruitOptions.find(f => f.option === fruit).label}  
      </Text>  
    </AutoLayout>  
  )  
}  
  
widget.register(PropertyMenuWidget)
```

[Previous

useSyncedMap](widget-usesyncedmap.md)[Next

useEffect](widget-useeffect.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
  - [Usage Example](#usage-example)
