<!-- source: https://developers.figma.com/docs/widgets/api/api-reference -->

- Widgets
- Overview
- API Reference

On this page

The Widget API allows you to create custom, interactive objects that extend the functionality of Figma design files and FigJam boards. You’ll likely use both the widget API and plugin API when building widgets.

- Widget API: defines the custom object and how people can interact with it
- Plugin API: access external resources or manipulate other nodes in the file

The Widget API is a component-based API similar to React. It gives you access to the tools you need to build a widget node on the canvas that responds to a variety of interactions.

There are three main aspects of the Widget API: components, functions, and hooks. Together they control rendering the widget in a file and managing its [state](../widget-state.md) as you interact with it.

If you’ve used the Plugin API, you’ll already be familiar with the `figma` global object. You can access the Widget API from that same `figma` object, via `figma.widget`.

## Components[​](#components "Direct link to Components")

Components are the layers you’ll use to build your custom interactive widget. You can think of them as building blocks.

Each component supports a range of properties, which you can use to customize their appearance. Some properties are shared across components and some are unique to specific components.

There are components based on layers or node types you can already find and use in files:

- [`AutoLayout`](component-AutoLayout.md)
- [`Frame`](component-Frame.md)
- [`Text`](component-Text.md)
- [`Rectangle`](component-Rectangle.md)
- [`Image`](component-Image.md)
- [`Ellipse`](component-Ellipse.md)
- [`SVG`](component-SVG.md)
- [`Line`](component-Line.md)

There are three other components available that aren’t based on layers:

- [`Input`](component-Input.md): allows you to make a text component editable. This makes it possible for people to input or update text components within the widget.
- [`Fragment`](component-Fragment.md): allows you to render children without having to group them in a parent node. You can't pass properties to a fragment.
- [`Span`](component-Span.md): allows you to style ranges of text inside of a `Text` component.

## Functions[​](#functions "Direct link to Functions")

Functions are statements or blocks of code that perform a specific task. Functions accept parameters and other data as input and return a related output. There are only two functions defined in the Widget API:

- [`register`](properties/widget-register.md): the main entry point for rendering a widget. This function expects a widget function that describes your widget and returns the widget node made up of the components we mentioned above.
- [`waitForTask`](properties/widget-waitfortask.md): this function enables asynchronous work, such as data fetching. It accepts a promise and only terminates when that promise resolves.
- [`colorMapToOptions`](properties/widget-colormaptooptions.md): this function is called on a color palette defined in `figma.constants.colors.*`, and returns `WidgetPropertyMenuColorSelectorOption[]`.

## Hooks[​](#hooks "Direct link to Hooks")

Hooks are a specific type of function. They allow you to reuse state-based logic or behavior across your components. You can identify hooks by their `use` prefix.

- [`useEffect`](properties/widget-useeffect.md): this hook can run any time the widget's state changes. It allows you to perform asynchronous tasks, bundle calls, or consolidate the side-effects of event handlers.
- [`usePropertyMenu`](properties/widget-usepropertymenu.md): this hook allows you to define an interactive property menu that displays when the widget is selected.
- [`useStickable`](properties/widget-usestickable.md): this FigJam only hook allows your widget to be stuck to other nodes in the file. This is similar to how stamps work in FigJam files.
- [`useStickableHost`](properties/widget-usestickablehost.md): this FigJam only hook allows other nodes in the file to stick to your widget.
- [`useSyncedState`](properties/widget-usesyncedstate.md): this hook declares that rendering your widget relies on a changeable state. You give this hook a key and default value, which you can use and update across different states.
- [`useSyncedMap`](properties/widget-usesyncedmap.md): this hook also allows you to manage widget state. You can give this hook multiple keys and values and update widget state based on changes to individual values, not the entire map. This allows you to accurately render widget state when multiple people interact with a widget at once.
- [`useWidgetId`](properties/widget-usewidgetid.md): this hook allows you to reference a currently active widget. It returns a unique `id` which allows you to reference that WidgetNode in the Plugin API.

## Destructure globals[​](#destructure-globals "Direct link to Destructure globals")

We recommend [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#object_destructuring) components, hooks, and functions at the beginning of your widget code. This saves you from having to reference each of these components by their qualified names, such as `figma.widget.AutoLayout`.

```
const { widget } = figma  
const {  
  // Components  
  AutoLayout,  
  Frame,  
  Text,  
  Input,  
  Rectangle,  
  Image,  
  SVG,  
  Ellipse,  
  Line,  
  Fragment,  
  
  // Hooks  
  useSyncedState,  
  useSyncedMap,  
  usePropertyMenu,  
  useEffect,  
  useStickable,  
  useStickableHost,  
  useWidgetId,  
  
  // Functions  
  register,  
  waitForTask  
} = widget
```

In our sample counter widget, we’ve done this to `figma.widget` as well as the individual hooks (`useSyncedState` and `usePropertyMenu`) and components (`AutoLayout`, `Text`, `SVG`) we’ll use in our widget code:

```
const { widget } = figma  
const { useSyncedState, usePropertyMenu, AutoLayout, Text, SVG } = widget
```

[Next

Widget Manifest](../widget-manifest.md)

- [Components](#components)
- [Functions](#functions)
- [Hooks](#hooks)
- [Destructure globals](#destructure-globals)
