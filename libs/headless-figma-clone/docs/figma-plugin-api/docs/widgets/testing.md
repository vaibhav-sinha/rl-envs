<!-- source: https://developers.figma.com/docs/widgets/testing -->

- Widgets
- Development Guides
- Testing

Once you have the initial design and logic for your widget, you’ll want to stress test it across various scenarios to make sure it works properly. This includes not only focusing on the core use cases of your widget, but also considering situations that you didn't expect.

Here are some helpful things to keep in mind as you test & debug your widget:

- What are the core use cases of your widget? Make sure to test those extensively.
- What are ways users might incorrectly use your widget? Test those too.
- Have you loaded all the data your widget needs?
  - Do you need to [access pages](../plugins/accessing-document.md#loading-pages-and-nodes) other than the user's current page?
- If your widget is only meant to do something if certain [type of nodes](../plugins/api/nodes.md) are selected, what happens when:
  - The user has nothing selected?
  - The wrong type of node is selected?
  - Multiple things are selected?
  - A component is selected? Are you alright with the change propagating to potentially hundreds of instances?
- If your widget modifies a text layer, what happens [if the font for that text layer is missing?](../plugins/working-with-text.md#missing-fonts)
- If your widget can edit a [component](../plugins/api/ComponentNode.md), what happens if the component comes from the team library?
- If your widget executes long-running tasks, note that the user can unexpected stop your widget by:
  - Deleting your widget
  - Interacting with another widget
  - Leaving the file
  - Losing internet connection/going offline
- If your widget stays open for a while:
  - What happens if the user [deletes a node](../plugins/api/properties/nodes-removed.md) you currently have a reference to?
  - What happens a multiplayer event causes changes in the document?
- If your widget is concerned with the position of layers, what happens if something is rotated?
- If your widget can traverse large parts of the document (e.g. search for a node), what happens if the document is [very large](../plugins/frozen-plugins.md)**?**
  - Can you [load pages only as needed](how-widgets-run.md#file-loading) instead of loading the whole document?
- If you're using a bundler, have you checked the output size of your widget? Could you make it smaller (e.g. by running your bundler in release mode)?
- Widgets are highly collaborative — make sure to test your widget with multiple people. If you can’t do that, open a file that contains your widget in two windows of the Figma Desktop app.
- Keep in mind that [FigJam for iPad](https://www.figma.com/figjam/ipad/) is available. Is your widget usable on a smaller screen like an iPad?

Read more about our [widget review guidelines](https://help.figma.com/hc/en-us/articles/360039958914).

[Previous

Best Practices](best-practices.md)[Next

Stability and Updates](stability-and-updates.md)
