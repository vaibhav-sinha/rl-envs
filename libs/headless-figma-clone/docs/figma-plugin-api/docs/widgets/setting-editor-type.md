<!-- source: https://developers.figma.com/docs/widgets/setting-editor-type -->

- Widgets
- Basics of Widgets
- Setting Editor Type

On this page

Widgets are custom interactive objects that run in Figma design and FigJam files.

These environments support the kinds of work you would do at each stage of the design process. Whether you're brainstorming and workshopping or working on high-fidelity designs. [Compare Figma and FigJam →](https://help.figma.com/hc/en-us/articles/1500004290201-Compare-Figma-and-FigJam)

The Plugin and Widget APIs treat Figma design and FigJam files as different editor types. You can create widgets for a specific editor type or both editor types. You can even create widgets that do different things in each editor.

For your widget to work, you need to declare which editor type(s) your widget can run in. You can do this by setting the `editorType` field in the widget’s manifest.

```
{  
  "name": "MyWidget",  
  "id": "737805260747778093",  
  "api": "1.0.0",  
  "widgetApi": "1.0.0",  
  "editorType": ["figma", "figjam"],  
  "containsWidget": true  
  "main": "code.js",  
  "ui": "ui.html"  
}
```

tip

📝 **Note**: Declaring an editor type impacts which files your published plugin can run in. During the development process, you can insert and run widgets in both file types.

## Supported APIs[​](#supported-apis "Direct link to Supported APIs")

When you declare a specific editor type, you can only access APIs that are available on that editor type.

You can access a majority of the Widget API in both editor types. This includes components and their supported properties.

There are some features of the Widget (and Plugin) API that are only supported on certain editor types. For example: stickable hooks are only supported in FigJam files. To learn more about these differences, you can read the [Figma design or FigJam files](figma-figjam-widgets.md) guide.

## Choosing an editor type[​](#choosing-an-editor-type "Direct link to Choosing an editor type")

Create widgets that run in a specific editor type. This is useful when your widget is best suited to a certain environment.

- To create a widget that only runs in FigJam files:

```
"editorType": [  
  "figjam"  
],
```

- To create a widget that only runs in Figma design files:

```
"editorType": [  
  "figma"  
],
```

Create widgets that run in both editor types. This gives people more flexibility when using your widget. To create a widget that works in both editors:

```
"editorType": [  
  "figjam",  
  "figma"  
],
```

If you want to set conditional logic, you can use the method `figma.editorType`. This will return a string value of either `"figma"` or `"figjam"`.

```
if (figma.editorType === 'figjam') {  
  figma.createShapeWithText();  
}
```

tip

📝 **Note:** As we mentioned above, there are some functions that aren’t supported in both editor types. This means people using your widget may have different experiences across file types.

You can help set expectations with clear signifiers and instructions, and detailed error messages. [Testing your widget →](testing.md)

[Previous

Working with Widgets](working-with-widgets.md)[Next

Widget State & Multiplayer](widget-state-and-multiplayer.md)

- [Supported APIs](#supported-apis)
- [Choosing an editor type](#choosing-an-editor-type)
