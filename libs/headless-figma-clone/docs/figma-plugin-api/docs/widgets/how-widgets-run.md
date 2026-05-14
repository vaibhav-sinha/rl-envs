<!-- source: https://developers.figma.com/docs/widgets/how-widgets-run -->

- Widgets
- Basics of Widgets
- How Widgets Run

On this page

Widgets run inside the same [sandbox as Plugins](../plugins/how-plugins-run.md) but with the additional ability to:

- Create a custom object that lives on the canvas
- Respond to user interactions on these custom objects

Widgets only run in response to user interaction and only on the specific client that initiated this interaction. All other clients will see the updated widget via regular updates to the file, via Multiplayer.

![](https://static.figma.com/uploads/ec53bbec145997770f080e95067309f6e72247e4)

As pictured above, it is helpful to think about Widget Code in 2 distinct parts:

1. **Rendering Code** that describes how a widget should look
2. **State Updating Code** that updates widget state

## Rendering Code[​](#rendering-code "Direct link to Rendering Code")

Code that describes how a widget should look runs synchronously and should solely depend on a widget’s state in order to avoid inconsistencies when rendering across multiple clients. For instance, a widget shouldn’t depend on attributes of other nodes on the canvas when deciding how it looks.

If you want to use something like [`figma.activeUsers`](../plugins/api/figma.md#activeusers) in your widget, the recommended pattern is to use a [lazy default initializer](api/properties/widget-usesyncedstate.md#lazy-initial-state) to initialize a synced state value.

**This will be enforced at the API level - widget rendering code won’t be able to read and access data outside of the particular widget’s state.**

## State Updating Code[​](#state-updating-code "Direct link to State Updating Code")

Code that updates [widget state](widget-state.md) runs asynchronously; when completed, the widget will re-render. Widgets can do more than just read the widget state: they can access the document via the Plugin API, make network requests via iframes, and open iframes to get more user input.

## File Loading[​](#file-loading "Direct link to File Loading")

Pages in Figma files are loaded as needed, and most widgets will *not* require access to a user’s complete Figma document. If your widget acts on multiple or all pages in a user's file, you can still improve the experience of users in a very large file by having your widget [load more pages only as needed](../plugins/accessing-document.md). To help, TypeScript type definitions are available in our [official typings](https://github.com/figma/widget-typings).

## Network access[​](#network-access "Direct link to Network access")

Additional network security is enforced if your widget [limits network access](widget-manifest.md#networkaccess). When network access is limited, if your widget attempts to access a domain that isn't specified in your widget's manifest, Figma blocks that attempt and returns a content-security policy (CSP) error.

The enforcement of domain access is limited only to requests made by the widget, such as Fetch API requests to a public REST API. If your widget renders a website in an iframe, network access limits only apply directly to the website's domain. Network access limits do not affect resources needed by that website. For example, suppose your widget frames and limits access only to `figma.com`. Your widget would be prevented from rendering content from other domains. However, `figma.com` would still be able to load external resources, such as scripts for Google Analytics.

[Previous

Figma and FigJam Widgets](figma-figjam-widgets.md)[Next

Widget State](widget-state.md)

- [Rendering Code](#rendering-code)
- [State Updating Code](#state-updating-code)
- [File Loading](#file-loading)
- [Network access](#network-access)
