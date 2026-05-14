<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-setrelaunchdata -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- setRelaunchData

On this page

Sets state on the node to show a button and description when the node is selected. Clears the button and description when `relaunchData` is `{}`.

info

In Figma and Dev Mode, this shows up in the properties panel. In FigJam, this shows up in the property menu. See [here](nodes-setrelaunchdata.md#example-figma-design-ui) for examples.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [DocumentNode](../DocumentNode.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PageNode](../PageNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SliceNode](../SliceNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### [setRelaunchData](nodes-setrelaunchdata.md)(data: { [command: string]: string }): void

## Parameters[​](#parameters "Direct link to Parameters")

### data[​](#data "Direct link to data")

```
{  
  [command: string]: string // description  
}
```

e.g. `data = { myCommand: 'Short description' }`

### command[​](#command "Direct link to command")

The string that will be passed as `figma.command` when the plugin is run after the button is clicked. This command must be present in the [manifest](../../manifest.md#relaunchbuttons) under one of the `relaunchButtons`, which is used to look up the name to display for the button.

### description[​](#description "Direct link to description")

Up to three lines of text that will be displayed under the button to provide plugin specific information about the node or any clarification about the action the button will perform. This method will throw if description exceeds 1000 characters, but the UI will display even less (only 3 lines).

## Remarks[​](#remarks "Direct link to Remarks")

Each call to this method sets entirely new relaunch data, removing any relaunch data and associated buttons/descriptions from before. To maintain buttons from a previous call one can store the button information using [setPluginData](nodes-setplugindata.md) and later fetch it with [getPluginData](../PageNode.md#getplugindata) before passing it on to `setRelaunchData`.

To use this API, the plugin manifest must include a `relaunchButtons` section: see the [manifest guide](../../manifest.md#relaunchbuttons) for more information.

info

Note that if the `command` passed to this method does not match a command in the manifest, nothing will be displayed. Similarly if the name of a command in the manifest changes or is removed, then all buttons with that command will disappear. This behavior can be used to remove buttons when a particular action is no longer supported by the plugin.

In Figma design, the relaunch data can also be placed on the [`PageNode`](../PageNode.md) or [`DocumentNode`](../DocumentNode.md), to show a button and description when nothing is selected. Relaunch buttons added to the [`PageNode`](../PageNode.md) will be displayed on that page, combined with buttons from the [`DocumentNode`](../DocumentNode.md) that show on every page. This is not supported in FigJam.

## Examples[​](#examples "Direct link to Examples")

manifest.json

```
// With the following in the manifest:  
"relaunchButtons": [  
  {"command": "edit", "name": "Edit shape"},  
  {"command": "open", "name": "Open Shaper", "multipleSelection": true}  
]
```

code.ts

```
// Add two buttons (ordered by the above array from the manifest):  
// * an "Edit shape" button with a description of "Edit this trapezoid  
//   with Shaper" that runs the plugin with `figma.command === 'edit'`.  
// * an "Open Shaper" button with no description that runs the plugin with  
//   `figma.command === 'open'`.  
node.setRelaunchData({ edit: 'Edit this trapezoid with Shaper', open: '' })  
  
// With the following in the manifest:  
"relaunchButtons": [  
  {"command": "relaunch", "name": "Run again", "multipleSelection": true}  
]  
  
// Pass an empty description to show only a button  
node.setRelaunchData({ relaunch: '' })  
  
// Remove the button and description  
node.setRelaunchData({})
```

### Example Figma Design UI[​](#example-figma-design-ui "Direct link to Example Figma Design UI")

![Relaunch UI in Figma Design](/assets/images/relaunch_ui_design-2123786a1723df0ec8abc6e52170d1d8.png)

### Example FigJam UI[​](#example-figjam-ui "Direct link to Example FigJam UI")

![Relaunch UI in FigJam](/assets/images/relaunch_ui_figjam-f623cdda760c44d264a9a057ed6a468f.png)

[Previous

setPluginData](nodes-setplugindata.md)[Next

setSharedPluginData](nodes-setsharedplugindata.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [data](#data)
  - [command](#command)
  - [description](#description)
- [Remarks](#remarks)
- [Examples](#examples)
  - [Example Figma Design UI](#example-figma-design-ui)
  - [Example FigJam UI](#example-figjam-ui)
