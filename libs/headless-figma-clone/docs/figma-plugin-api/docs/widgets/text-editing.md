<!-- source: https://developers.figma.com/docs/widgets/text-editing -->

- Widgets
- Development Guides
- Text Editing

On this page

## `<Input />` component[​](#input--component "Direct link to input--component")

To allow users to exit text directly in your widget, use the [`Input`](api/component-Input.md) component.

The Input component provides an [`onTextEditEnd`](api/component-Input.md#ontexteditend) callback that fires when the user blurs the Input component.

caution

⚠️ [`onTextEditEnd`](api/component-Input.md#ontexteditend) does not fire on every key stroke.

The Input component also allows you to specify and style:

- The text itself
- A placeholder (via [`placeholderProps`](api/component-Input.md#placeholderprops))
- A wrapping frame (via [`inputFrameProps`](api/component-Input.md#inputframeprops))

## Example[​](#example "Direct link to Example")

Typically, you will use a synced variable (eg. [`useSyncedState`](api/properties/widget-usesyncedstate.md) or [`useSyncedMap`](api/properties/widget-usesyncedmap.md)) to store text displayed by the Input component which is specified via its [`value`](api/component-Input.md#value) prop. In the [`onTextEditEnd`](api/component-Input.md#ontexteditend) callback, you can then update the synced variable accordingly.

Here is an example widget that uses the `Input` component.

![Example input component](https://static.figma.com/uploads/52546777ad3920192e1e9f468f3c66b130ed6891)

Example

```
const { widget } = figma  
const { useSyncedState, AutoLayout, Input } = widget  
  
function InputWidget() {  
  const [text, setText] = useSyncedState("text", "")  
  
  return (  
    <Input  
      value={text}  
      placeholder="Type name"  
      onTextEditEnd={(e) => {  
        setText(e.characters);  
      }}  
      fontSize={64}  
      fill="#7f1d1d"  
      width={500}  
      inputFrameProps={{  
        fill: "#fee2e2",  
        stroke: "#b91c1c",  
        cornerRadius: 16,  
        padding: 20,  
      }}  
      inputBehavior="wrap"  
    />  
  )  
}  
  
widget.register(InputWidget)
```

[Previous

Making Network Requests](making-network-requests.md)[Next

Working with Lists](working-with-lists.md)

- [`<Input />` component](#input--component)
- [Example](#example)
