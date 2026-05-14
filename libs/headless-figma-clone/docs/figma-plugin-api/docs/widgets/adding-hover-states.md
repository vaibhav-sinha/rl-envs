<!-- source: https://developers.figma.com/docs/widgets/adding-hover-states -->

- Widgets
- Development Guides
- Adding Hover States

On this page

## Overview[​](#overview "Direct link to Overview")

Any component can take an optional **`hoverStyle`** property that takes on property overrides. These overrides will be applied when a user hovers over a parent **hover target**.

The **`hoverStyle`** prop accepts the type of **[`HoverStyle`](api/type-HoverStyle.md)** and the only properties that can be overridden by it are:

- `fill`
- `stroke`
- `opacity`

A valid **hover target** is currently defined as any component that has an `onClick` or `onTextEditEnd` event handler on it.

When hovering over a **hover target** the hoverStyle of the target and all of its children recursively are applied, unless they are in a **hover target** that isn't currently hovered.

## Example[​](#example "Direct link to Example")

In the below example hovering over the button will make the containing `AutoLayout` black and the nested `Text` inside of it white.

Adding hover styles to a button

```
const { widget } = figma  
const { useSyncedState, AutoLayout, Text } = widget  
  
function Widget() {  
  const [count, setCount] = useSyncedState('count', 0)  
  
  return (  
    <AutoLayout  
      verticalAlignItems={'center'}  
      spacing={8}  
      padding={16}  
      cornerRadius={8}  
      fill={'#FFFFFF'}  
      stroke={'#E6E6E6'}  
      onClick={() => setCount(count + 1)}  
      hoverStyle={{  
        fill: '#000000',  
      }}  
    >  
      <Text  
        fill="#000000"  
        hoverStyle={{  
          fill: '#FFFFFF',  
        }}  
      >  
        Count: {String(count)}  
      </Text>  
    </AutoLayout>  
  )  
}  
  
widget.register(Widget)
```

Here is a gif of it in action:
![Hover button](data:image/gif;base64,dmVyc2lvbiBodHRwczovL2dpdC1sZnMuZ2l0aHViLmNvbS9zcGVjL3YxCm9pZCBzaGEyNTY6OWI4ZDgyMjg4YjM2NmVjNjZjNGQ0YTU1MzIwYmE4ZmU5ZmIxNzNhZTNkMmQ5ZjJhYTZmYmYzYjRkNGU4ZTZhZgpzaXplIDE4NjY1OAo=)

[Previous

Managing Multiple Widgets](managing-multiple-widgets.md)[Next

Undo/Redo for Widgets](undo-redo.md)

- [Overview](#overview)
- [Example](#example)
