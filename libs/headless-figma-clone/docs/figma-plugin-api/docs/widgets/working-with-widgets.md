<!-- source: https://developers.figma.com/docs/widgets/working-with-widgets -->

- Widgets
- Basics of Widgets
- Working with Widgets

In order to ensure predictable and performant Widgets, here’s a list of things to keep in mind as you’re building them:

1. A widget’s render function should depend only on values returned by `useSyncedState` OR `useSyncedMap`.
2. Widgets appear the exact same to all users.
3. The only way to update a widget is by updating its state, which will re-render the widget automatically.
4. Many widgets can be in a file, but a user is only allowed to run one widget at a time.
5. If a widget's manifest does not contain the `"documentAcces": "dynamic-page"` manifest field, then when the widget runs for the first time, all pages in the document are loaded. In very large or complex files, this can result in a significant delay (sometimes 20 to 30 seconds) as the file loads. Consider updating your widget to include the `documentAccess` manifest field, and only [load pages](../plugins/accessing-document.md) as needed.
6. Widget code can be terminated at any time by the user / FigJam. Known events that would terminate widget code are:

- a user leaves/closes the file
- a user explicitly stops a long running widget via the visual bell
- a user deletes the running widget
- a user explicitly interacts with another widget in the file

[Previous

Using the Plugin API](using-the-plugin-api.md)[Next

Setting Editor Type](setting-editor-type.md)
