<!-- source: https://developers.figma.com/docs/widgets -->

- Widgets
- Getting Started
- Introduction

On this page

Welcome to the Widget API!

Widgets are interactive objects that extend the functionality of design files and FigJam boards.
Unlike plugins that run for a specific person, everyone can see and interact with the same widget.
You can add as many widgets to the board as you need and even run them at the same time. This makes them great for collaboration!

If a widget does not contain the manifest field `"documentAccess": "dynamic-page"`, the entire document will be loaded when a widget runs or is interacted with. In large or complex files, loading the entire document the first time your widget runs can sometimes cause a delay of 20 to 30 seconds. If your widget needs to access other pages in the document, update your widget to contain the `documentAccess` manifest field and only [load the pages the user needs](plugins/accessing-document.md), rather than the whole document.

Here’s a few examples of the types of widgets you can create:

- Import data to create tables or interactive visualizations
- Gather insight through live polls and voting counters
- Build timelines and manage projects with calendars
- Connect and play games in multiplayer

Not sure what you want to create? Check out these guides:

- **[Widgets vs plugins →](widgets/widgets-vs-plugins.md)**
- **[Figma design or FigJam widgets →](widgets/figma-figjam-widgets.md)**
- **[Explore widgets in the Community →](https://www.figma.com/community/widgets)**

## Build widgets[​](#build-widgets "Direct link to Build widgets")

We've designed the Widget API around two JavaScript-based technologies: TypeScript and JSX. You'll need to have a basic understanding of JavaScript to build widgets. If you have written React before you’ll feel right at home! **[Required knowledge →](widgets/prerequisites.md)**

A widget is a function that renders components inside a dedicated widget object. You build your widget interface from a combination of components or sublayers. Then pass in properties to customize the look and feel of the widget.

When we talk about components, we’re using language from [React components](https://reactjs.org/docs/components-and-props.html). These are different to the components and instances you'd use in Figma. Most of the components in the Widget API are layers you’d interact with in files—such as frames, text, and shapes. **[Explore Widget API reference →](widgets/api/api-reference.md)**

![Widget components](https://static.figma.com/uploads/a1de4b17f2223c038bce3d888fc4dbc9a65fe66c)

Widgets are objects in files that everyone can see and use. You can choose how people can interact with your widget. You can specify a property menu, create a custom interface, or run widgets in response to click events. **[Customize widget interactions →](widgets/handling-user-events.md)**

![Widget interaction](https://static.figma.com/uploads/415e9599a57feae0a9936db7eb96c17099bbb21d)

Widgets can also access the functionality of the Plugin API. This allows you to pull data from external resources, open an iFrame to show more UI, or edit other objects in a file. If you’re building a standalone widget, you may not use the Plugin API at all. [**Using the Plugin API →**](widgets/using-the-plugin-api.md)

## Resources[​](#resources "Direct link to Resources")

Our [QuickStart](widgets/setup-guide.md) guide show you how to set up your environment and run a sample widget. You can [explore our sample widgets](https://github.com/figma/widget-samples) in GitHub for more inspiration.

The [API reference](widgets/api/api-reference.md) covers the components, hooks, and functions you’ll use build widgets. Our development guides explore concepts and outline the process for building successful widgets.

Get help with your plugin and widget related questions in the [Figma Community forum](https://forum.figma.com/c/plugin-widget-api/20). To connect with other widget and plugin developers [join our community-driven Discord server](https://discord.gg/xzQhe2Vcvx).

[Next

Prerequisites](widgets/prerequisites.md)

- [Build widgets](#build-widgets)
- [Resources](#resources)
