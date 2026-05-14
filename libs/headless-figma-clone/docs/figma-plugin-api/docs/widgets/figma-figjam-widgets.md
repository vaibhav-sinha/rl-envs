<!-- source: https://developers.figma.com/docs/widgets/figma-figjam-widgets -->

- Widgets
- Getting Started
- Figma and FigJam Widgets

On this page

Widgets are custom interactive objects that run in Figma design and FigJam files.

You can create standalone widgets that don’t need to anything else to run, such as our [sample counter widget](https://github.com/figma/widget-samples/tree/main/WidgetCounter). In this situation, you can use the Widget API without the Plugin API.

You can also create widgets that pull data from external resources or applications, or interact with and edit other layers in the file. For those types of widgets, you’ll need to use both the [Widget API ↓](#widget-api) and the [Plugin API ↓](#plugin-api).

In this guide we’ll walk you through a few things to consider when it comes to Figma design and FigJam files.

tip

📝 **Note:** Both the Plugin and Widget APIs treat Figma design and FigJam files as different editor types. For your widget to work, you need to tell Figma which editor types your widget can run in. [Setting editor type →](setting-editor-type.md)

## Widget API[​](#widget-api "Direct link to Widget API")

The Widget API allows you to build a widget node that responds to user interaction. Build the widget using components, then manage its state through functions and hooks. [How widgets run →](how-widgets-run.md)

You can access a majority of the Widget API in both editor types. This includes components and their supported properties. There are still a few things to consider when building your widget.

### Stickable interactions [FigJam only][​](#stickable-interactions-figjam-only "Direct link to Stickable interactions [FigJam only]")

One aspect that's unique to FigJam files, and isn’t supported in design files, is [stickable hooks](handling-user-events.md#stickable-hooks). Stickable widgets can attach to other nodes, like stamps. Stickable host widgets allow you to attach other stickables to it.

If you set the `editorType` to `"figma"` only, or run the widget in a Figma design file, you can’t access either of these hooks:

- [`useStickable`](api/properties/widget-usestickable.md)
- [`useStickableHost`](api/properties/widget-usestickablehost.md)

### Dark mode [Figma design only][​](#dark-mode-figma-design-only "Direct link to Dark mode [Figma design only]")

Figma designs supports both light and dark [themes](https://help.figma.com/hc/en-us/articles/5576781786647). FigJam only supports a light theme.

If you plan to use [`figma.showUI`](../plugins/api/properties/figma-showui.md) to show additional UI, you can enable the `themeColors` option. This allows you to use [CSS variables](../plugins/css-variables.md) that contain theme-specific colors. Your iframe UI will then adapt to the user’s current theme.

For the widget itself, you still need to assign explicit `fill`, `stroke`, and `opacity` values to components.

## Plugin API[​](#plugin-api "Direct link to Plugin API")

The Plugin API allows you to view, create, and edit the contents of Figma design and FigJam files.

If you want your widget to open an iframe, or interact with other layers in the file, you’ll need to use the Plugin API.

The editor type impacts which objects, nodes, and functions are available in the Plugin API. [Explore what’s supported in the Plugin API →](../plugins.md)

[Previous

Widgets vs Plugins](widgets-vs-plugins.md)[Next

How Widgets Run](how-widgets-run.md)

- [Widget API](#widget-api)
  - [Stickable interactions [FigJam only]](#stickable-interactions-figjam-only)
  - [Dark mode [Figma design only]](#dark-mode-figma-design-only)
- [Plugin API](#plugin-api)
