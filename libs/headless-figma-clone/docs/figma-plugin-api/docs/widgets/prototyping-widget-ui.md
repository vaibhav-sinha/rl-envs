<!-- source: https://developers.figma.com/docs/widgets/prototyping-widget-ui -->

- Widgets
- Basics of Widgets
- Prototyping Widget UI

On this page

Once you have created a widget, the best way to see how it looks is to insert it in a file. This allows you to preview your widget interface, as well as test any interaction.

## Insert widgets[​](#insert-widgets "Direct link to Insert widgets")

The Widget API supports two file or editor types: FigJam and Figma. You can create widgets for FigJam or Figma, or widgets that run in both. You’ll [set the editor type](setting-editor-type.md) as part of your widget’s [manifest](widget-manifest.md).

During the development process, you can insert widgets into either editor type. This is regardless of the `editorType` set in the widget's manifest.

tip

💡 If you haven’t created a widget yet, you can follow our [QuickStart](setup-guide.md) guide to download a sample counter widget. This will give you an idea of how this process works, without having to creating your widget from scratch.

### Figma design[​](#figma-design "Direct link to Figma design")

Insert widgets into FigJam files to preview designs and test their interactivity. In design files, you can also [view and adjust the properties of your widget’s sublayers](#view-and-adjust-widget-sublayers).

You can use this functionality to explore and iterate on your widget’s design.

1. Using the [**Figma Desktop app**](https://www.figma.com/downloads/), open the design file where you want to insert the widget.
2. In the toolbar, open the **Component, widget, and plugins** insert menu and select the **Widget** tab.

![Inserts - Toolbar](https://static.figma.com/uploads/52a7ab67b4808eb848edff47e22cc6c4fe40a4c4)

3. Click the **Recents** header and select **Development** from the options. If you don’t see this option, make sure you are in the desktop app and have created a widget.

![Inserts - Development](https://static.figma.com/uploads/92707ba28af6adf7899e8562ce5eb899504cb3d0)

4. Select the widget from the list of options. Figma will insert the widget into the file.

### FigJam[​](#figjam "Direct link to FigJam")

Insert widgets into FigJam files to preview designs and test their interactivity. You can’t view or edit individual layers and properties in FigJam files.

1. Open a FigJam file in the desktop app.
2. In the bottom toolbar, select **Widgets, stickers, templates, and more**.

![FigJam insert - toolbar](https://static.figma.com/uploads/9d69c1986abaebf302cf46f8e23d90d03638c715)

3. Select the **Widgets** tab.
4. In the **Development** section, select the widget you want to insert:

![FigJam insert widgets](https://static.figma.com/uploads/6ccd79387442727d0fd416246bcb8e830d111275)

info

📝 You can also insert widgets from the Figma icon menu or right-click menu. Select the Figma icon in the toolbar or right-click anywhere on the canvas. Go to **Widgets > Development** and select your widget to install it.

## Widget state and rendering[​](#widget-state-and-rendering "Direct link to Widget state and rendering")

During the development process, you’ll likely want to preview your changes in real time. If you select the widget in your file, that instance will re-render any time you make a change to the widget code.

This is called hot reloading. Hot reloading only updates the affected widget sublayers and preserves the widget’s state. This is useful when prototyping changes to your widget.

> For example: our selected counter widget has registered 3 clicks in the current file. In our code editor, we change the `fill` property of the `AutoLayout` component from the original white (`#FFFFFF`) to a light blue (`#F1F6FF`). The widget renders in the current file with the updated fill, while the counter stays at 3.

You can also force a widget to re-render at any time. The widget will render based on the current widget code.

1. Right-click on the widget in the file.
2. Hover over the **Widgets** menu.
3. Select **Re-render widget** from the options:

![Rerender widget](https://static.figma.com/uploads/5eb99c5409df41d9e7c47034c48fb889fc439b10)

Every widget also has its own state. If you insert multiple widgets into a file, you can interact with each widget independently. If you want to restore a widget to it’s default value, you can reset its state:

1. Right-click on the widget in the file.
2. Hover over the **Widgets** menu.
3. Select **Reset widget state** from the options:

![Reset state](https://static.figma.com/uploads/4040acb58e5f70469fff244d74fd17f9729e9852)

## Test interactions and events[​](#test-interactions-and-events "Direct link to Test interactions and events")

There are many ways widgets can [respond to interaction](handling-user-events.md). Your widget doesn’t need to support all interactions. We recommend testing them anyway to make sure your widget responds as expected.

If you have used the [`hoverStyle`](api/type-HoverStyle.md) property, you can check they work with the rest of your widget design.

info

📝 **Supported interactions**

- Respond to clicks using event listeners
- Interactions with a custom property menu
- Accept text input from widget users
- Adjust the appearance of a widget on hover
- Open an iFrame to access external resources or browser APIs
- Allow multiple people to interact with a widget at once
- Stick widgets to other objects or allow other objects to stick to widgets (FigJam only)

**[Handling user events →](handling-user-events.md)**

To reset a widget to it’s original state: right-click on the widget and select **Widgets > Reset widget state**. If you made any change to a component’s properties, these will also be reset.

For more tips on testing widget interactions, read our [Testing](testing.md) guide.

## View and adjust widget sublayers[​](#view-and-adjust-widget-sublayers "Direct link to View and adjust widget sublayers")

tip

💡 **Want to design your widget in Figma first?**

Figma’s [Widget Code Generator](https://www.figma.com/community/plugin/1096460041736534298/Widget-Code-Generator) plugin generates widget UI from existing frames. This translates your design into components and properties in the widget API.

You’ll still need to edit the generated code to add interactivity and support user events. **[Use the Widget Code Generator plugin →](https://help.figma.com/hc/en-us/articles/5601345554967)**

If you insert a widget into a design file, you can view widget sublayers in the layers panel. This allows you to select individual layers and adjust their properties.

You can only view layers and adjust properties for widgets that are still in development. You can’t do this with published versions of the widget.

1. Select the widget in the canvas.
2. In the layers panel, look out for the purple widget layer. It will have the same name as your widget.
3. Click the arrow to expand the widget and view its sublayers. There are a few differences in name and appearance between the product and API:

   - The [`AutoLayout`](api/component-AutoLayout.md) component shows as a **Frame** with an icon that matches the direction of the auto layout. This can be a horizontal or vertical auto layout.
   - Any input components have a T icon and the actual string as the layer name. If you update the contents of the input, the layer name also updates.
   - If an SVG component has many paths, they appear as frame layers. Any shapes that make up the SVG appear as vector sublayers.

   [**View layers in the left sidebar →**](https://help.figma.com/hc/en-us/articles/360039831974)

![Widget layers](https://static.figma.com/uploads/c178d2824afa77d1eced71ec64fd9479eb9358cd)

tip

💡 **Tip!** Hold down ⌘Command / Ctrl and click on a specific element in the canvas to select that layer. **[Select layers and objects in design files →](https://help.figma.com/hc/en-us/articles/360040449873)**

### Adjust properties of widget sublayers[​](#adjust-properties-of-widget-sublayers "Direct link to Adjust properties of widget sublayers")

In Figma design files, you can also change the properties of the sublayers of a widget in the file. While this doesn’t update your widget code, it does allow you to preview changes before you commit them to code.

You can even insert multiple instances of the same widget and give them different properties. This is a great way to compare or iterate on designs during the development process.

- Test a combination of auto layout properties
- Preview changes to text, including font, size, and layout
- Apply paints to fills and strokes

caution

⚠️ Any time your widget is re-rendered or reset, you will lose any updates you applied. This happens when you run or insert a widget, or if you use the **Re-render widget** or **Reset widget state** options. [**Widget state and rendering ↑**](#widget-state-and-rendering)

You can access most of these properties from the **Design** tab of the right sidebar. View the **Components** section of the [Widget API reference](api/api-reference.md) to check supported properties.

![Adjust component](https://static.figma.com/uploads/0d1c56630edd117645f03f9110c50510281572a8)

For more information on updating properties, check out these help center articles:

- [Explore auto layout properties](https://help.figma.com/hc/en-us/articles/360040451373)
- [Explore text properties](https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties)
- [Basic shape tools in Figma design](https://help.figma.com/hc/en-us/articles/360040450133-Basic-shape-tools-in-Figma-design)
- [Using the arc tool](https://help.figma.com/hc/en-us/articles/360040450173)
- [Apply and adjust stroke properties](https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties)
- [Adjust alignment, rotation, and position](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-and-position)

info

📝 To clear your changes, or return a widget to it’s original design, you can re-render the widget. Right-click on the widget and select **Widgets > Re-render widget**.

You can also use this setting if your widget stops working after you edit its properties.

### Copy widget sublayers from FigJam[​](#copy-widget-sublayers-from-figjam "Direct link to Copy widget sublayers from FigJam")

You can’t view or edit individual layers and properties of widgets in FigJam files. If you want to iterate on your widget’s design, you can still copy the existing widget as an entire frame.

This allows you to paste those layers in a design file and explore different designs. This is particularly helpful when configuring properties of `AutoLayout` components.

These layers are separate from the actual widget. You can explore alternative designs without your changes being overridden.

1. Right-click on the widget.
2. Select **Widgets > Copy as layers** to copy the widget to your clipboard.

![Copy as layers](https://static.figma.com/uploads/b7e3194d28146a475ab31252869fc57c7fafae86)

3. Open a design file and right-click on a spot in the canvas.
4. Select **Paste here** to add your widget as a regular frame.

[Previous

Widget State](widget-state.md)[Next

Using the Plugin API](using-the-plugin-api.md)

- [Insert widgets](#insert-widgets)
  - [Figma design](#figma-design)
  - [FigJam](#figjam)
- [Widget state and rendering](#widget-state-and-rendering)
- [Test interactions and events](#test-interactions-and-events)
- [View and adjust widget sublayers](#view-and-adjust-widget-sublayers)
  - [Adjust properties of widget sublayers](#adjust-properties-of-widget-sublayers)
  - [Copy widget sublayers from FigJam](#copy-widget-sublayers-from-figjam)
