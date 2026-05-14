<!-- source: https://developers.figma.com/docs/widgets/best-practices -->

- Widgets
- Development Guides
- Best Practices

On this page

## Performance[​](#performance "Direct link to Performance")

In order to build widgets that are fast for most users and scenarios, it's helpful to understand the things that could make them slow.

The following things are particularly expensive for FigJam to render, so they have the potential to slow down your widget if used excessively, in particular for users on lower-powered computers. Please use them sparingly:

- **Blurs and shadows**: If you want to keep the look of these effects, you can rasterize them as images and then render the images in your widget. However, rasterization is a lossy process, meaning some vector data will be lost during the conversion.
- **Blend modes**: Any blend mode that is not `normal` or `passthrough` can be slow. Our renderer is heavily optimized for `normal` and `passthrough` blend modes.
- **Complex SVG**: These are expensive to render because we have to parse each SVG and create its individual layers.
- **Load additional pages only as needed**: If a widget does not contain the manifest field `"documentAccess": "dynamic-page"`, the entire document will be loaded when a widget is interacted with. In large or complex files, loading the entire document the first time your widget runs can sometimes cause a delay of 20 to 30 seconds. If your widget needs to access other pages in the document, only [load the pages the user needs](../plugins/accessing-document.md), rather than the whole document.

## Design[​](#design "Direct link to Design")

Because widgets are effectively interactive applications, how you think about both the visual and UX design of your widget is really important. Keep the following best practices in mind when designing your widgets:

- **Keep as much interaction on the canvas as possible:** the magic of widgets is in their on-canvas, multiplayer interactions, so you should try to keep all user actions on the canvas and reserve the property menu for settings or property changes.
- **Avoid making the entire widget clickable:** Widgets with large clickable areas can be difficult to select without accidentally triggering a click handler. Try to reserve some empty space that is not clickable, especially if the widget has a property menu which requires selection to show.
- **Position your iframe relative to your widget’s position:** If you are using an iframe to show settings on a widget, use the `position` property to show the iframe closer to your widget so it is easier to reach and doesn’t cover up the widget.

## Using the [Property menu](api/properties/widget-usepropertymenu.md)[​](#using-the-property-menu "Direct link to using-the-property-menu")

- **Keep the property menu simple:** too many options will not only clutter the UI, but will also overwhelm users. If your widget requires a lot of complex settings, think about putting them in an iframe instead of the property menu.
- **Do not repeat actions you can take on the widget in the property menu:** Showing the same actions on the widget and its property menu can be confusing to users. Make sure your widget’s actions are mutually exclusive to either surface.
- **Use icons + tooltips in the property menu whenever possible:** All FigJam native objects use icons with tooltips in their property menus. Try using icons as much as possible and only fall back to text buttons when the actions are difficult to convey with icons.
- **40x40 icons look best in the property menu:** keep these dimensions in mind!

[Previous

Undo/Redo for Widgets](undo-redo.md)[Next

Testing](testing.md)

- [Performance](#performance)
- [Design](#design)
- [Using the Property menu](#using-the-property-menu)
