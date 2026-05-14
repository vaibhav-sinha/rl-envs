<!-- source: https://developers.figma.com/docs/plugins/working-in-figjam -->

- Plugins
- Development Guides
- Working in FigJam

On this page

## FigJam[​](#figjam "Direct link to FigJam")

FigJam is an online, collaborative whiteboard that teams use to brainstorm, develop, and organize ideas.

**Use cases for FigJam:**

- Brainstorm and explore ideas
- Create decision trees, diagrams, and mind maps
- Run critiques or feedback sessions on designs
- Collect ideas, note feedback, and organize research
- Plan and run meetings, tutorials, or other interactive sessions
- Collaborate and align with project stakeholders all in one place

And like Figma's other products, plugins can also integrate with FigJam.

![Cropped Figma file and cropped FigJam file next to each other](https://help.figma.com/hc/article_attachments/1500011253421/Figma_versus_FigJam.png)

## Key differences between plugins in FigJam and other plugins[​](#key-differences-between-plugins-in-figjam-and-other-plugins "Direct link to Key differences between plugins in FigJam and other plugins")

Plugins in FigJam have some key differences when compared to other plugins:

### Pages[​](#pages "Direct link to Pages")

FigJam files contain one or more pages, but the Plugin API in FigJam doesn't support the ability to create multiple pages. This includes the [`createPage()`](api/properties/figma-createpage.md#signature) function.

### Components[​](#components "Direct link to Components")

FigJam files have their own purpose-built stickers, which you can access using the plugin API, along with any components from your enabled libraries, or any designs pasted from Figma design files into FigJam files. You’ll also be able to access any local styles or instances in a FigJam file using the plugin API.

However, it’s not possible to create new components in a FigJam file using the plugin API, or combine existing components as variants. You won’t be able to use the following functions:

- [`createComponent()`](api/properties/figma-createcomponent.md)
- [`combineAsVariants()`](api/properties/figma-combineasvariants.md)

You can, however, create an `InstanceNode` of a `ComponentNode` that is in a FigJam file.

### Styles[​](#styles "Direct link to Styles")

When using the plugin API in FigJam files, you can only access styles applied to existing nodes. You won’t be able to create or manage local styles using the following functions:

- [`createPaintStyle()`](api/figma.md#createpaintstyle.md)
- [`createTextStyle()`](api/figma.md#createtextstyle.md)
- [`createEffectStyle()`](api/figma.md#createeffectstyle.md)
- [`createGridStyle()`](api/figma.md#creategridstyle.md)
- [`moveLocalPaintStyleAfter()`](api/figma.md#movelocalpaintstyleafter.md)
- [`moveLocalTextStyleAfter()`](api/figma.md#movelocaltextstyleafter.md)
- [`moveLocalEffectStyleAfter()`](api/figma.md#movelocaleffectstyleafter.md)
- [`moveLocalGridStyleAfter()`](api/figma.md#movelocalgridstyleafter.md)
- [`moveLocalPaintFolderAfter()`](api/figma.md#movelocalpaintfolderafter.md)
- [`moveLocalTextFolderAfter()`](api/figma.md#movelocaltextfolderafter.md)
- [`moveLocalGridFolderAfter()`](api/figma.md#movelocalgridfolderafter.md)

### FigJam-specific nodes[​](#figjam-specific-nodes "Direct link to FigJam-specific nodes")

FigJam files have a few specific types of nodes, which are unique to that file type. This includes the `StickyNode`, `ShapeWithTextNode`, `ConnectorNode`, `CodeBlockNode`, `MediaNode`, and `TableNode` node types. When using the plugin API in FigJam, you can create and modify these node types.

It’s not possible to create these nodes in a Figma file, but you can read and modify any existing nodes of these types in Figma files.

If the `editorType` in your manifest does not include `figjam`, you **won’t** be able to access the following functions relating to those nodes:

- [`figma.createSticky()`](api/figma.md#createsticky.md)
- [`figma.createShapeWithText()`](api/figma.md#createshapewithtext.md)
- [`figma.createConnector()`](api/figma.md#createconnector.md)
- [`figma.createCodeBlock()`](api/figma.md#createcodeblock.md)
- [`figma.createGif()`](api/figma.md#creategif.md)
- [`figma.createTable(numRows, numColumns)`](api/figma.md#createtable.md)

### FigJam Timer[​](#figjam-timer "Direct link to FigJam Timer")

FigJam files support a [Timer](https://help.figma.com/hc/en-us/articles/4402269549591), which allows users in a file to set a time limit for their activities and watch it count down. The timer is visible to everyone with at least view access to the FigJam file.

The timer is specific to FigJam files, so you can access it via the plugin API in FigJam.

If the `editorType` in your manifest does not include `figjam`, you **won’t** be able to access the **figma.timer** function. This includes any events and properties related to that function.

### Modifying nodes[​](#modifying-nodes "Direct link to Modifying nodes")

There are certain node types in FigJam that you only read and modify, and not create, those are the `BooleanOperationNode`, `StampNode`, and `WidgetNode` types.

### Creating Figma-specific nodes in FigJam[​](#creating-figma-specific-nodes-in-figjam "Direct link to Creating Figma-specific nodes in FigJam")

There are some Figma-specific node types that can't be created using FigJam's UI, but can be created using the plugin API in FigJam. Those are the `LineNode`, `PolygonNode`, `RectangleNode`, `SliceNode`, `StarNode`, `TextNode`, and `VectorNode` types.

[Previous

Adding Pattern Fills and Strokes](adding-pattern-fills-and-strokes.md)[Next

Working in Dev Mode](working-in-dev-mode.md)

- [FigJam](#figjam)
- [Key differences between plugins in FigJam and other plugins](#key-differences-between-plugins-in-figjam-and-other-plugins)
  - [Pages](#pages)
  - [Components](#components)
  - [Styles](#styles)
  - [FigJam-specific nodes](#figjam-specific-nodes)
  - [FigJam Timer](#figjam-timer)
  - [Modifying nodes](#modifying-nodes)
  - [Creating Figma-specific nodes in FigJam](#creating-figma-specific-nodes-in-figjam)
