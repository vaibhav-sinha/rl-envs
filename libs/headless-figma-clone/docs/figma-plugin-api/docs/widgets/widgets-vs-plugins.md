<!-- source: https://developers.figma.com/docs/widgets/widgets-vs-plugins -->

- Widgets
- Getting Started
- Widgets vs Plugins

If you’re a developer who has built [plugins](../plugins.md) before, there are a few key differences to understand between plugins and widgets.

| **Plugins** | **Widgets** |
| --- | --- |
| Needs to be installed by each user in a file. | Anyone in a file can insert it onto the canvas, then it’s available for use by all users. |
| Users primarily interact with them outside of the canvas, via off-canvas iframes. | Users primarily interact with them directly on the canvas, like any other native object.  Widgets can create off-canvas iframes, but the entry points for these are on the widget itself. |
| Run specifically for the user who is running it. | Widgets are collaborative and multiplayer——everyone in a file sees the same instance of a widget. |
| Only one per user can be open at a time. | An unlimited number of widgets can be in a file and ready to be interacted with, like any other object on the canvas. |

**Widgets are better for:** collaborative use cases (e.g. voting) or single-player use cases that require on-canvas interactions (e.g. diagramming).

**Plugins are better for:** single-player automation use cases, use cases related to setting up the activities in a file, or single-player import/export (e.g. using content libraries).

[Previous

Setup Guide](setup-guide.md)[Next

Figma and FigJam Widgets](figma-figjam-widgets.md)
