<!-- source: https://developers.figma.com/docs/plugins/api/Annotation -->

- Plugins
- [Data Types](data-types.md)
- Annotation

On this page

Annotations let you add notes and pin properties to nodes in Dev Mode.

The `annotations` field is supported on the following node types: [ComponentNode](ComponentNode.md), [ComponentSetNode](ComponentSetNode.md), [EllipseNode](EllipseNode.md), [FrameNode](FrameNode.md), [InstanceNode](InstanceNode.md), [LineNode](LineNode.md), [PolygonNode](PolygonNode.md), [RectangleNode](RectangleNode.md), [StarNode](StarNode.md), [TextNode](TextNode.md), [VectorNode](VectorNode.md).

## Annotation properties[​](#annotation-properties "Direct link to Annotation properties")

```
interface Annotation {  
  readonly label?: string  
  readonly labelMarkdown?: string  
  readonly properties?: ReadonlyArray<AnnotationProperty>  
  readonly categoryId?: string  
}
```

See [AnnotationProperty](AnnotationProperty.md) for supported properties.

## Annotation node properties[​](#annotation-node-properties "Direct link to Annotation node properties")

### annotations: ReadonlyArray<[Annotation](Annotation.md)>

Annotations on the node.

Learn more about annotations in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935) or see the [Annotation type](Annotation.md) for usage examples.

---

## Example usage[​](#example-usage "Direct link to Example usage")

```
const node = figma.currentPage.selection[0]  
  
// Add an annotation note  
node.annotations = [{ label: 'Main product navigation' }]  
  
// Pin the fill property  
node.annotations = [{ properties: [{ type: 'fills' }] }]  
  
// Add an annotation with a note and width property pinned  
node.annotations = [  
  { label: 'Pressing activates animation', properties: [{ type: 'width' }] },  
]  
  
// Add a rich-text annotation label with markdown  
node.annotations = [  
  { labelMarkdown: '# Important \n Pressing activates a *fun* animation' },  
]  
  
// Add multiple annotations with annotation categories  
categories = await figma.annotations.getAnnotationCategoriesAsync()  
interactionCategory = categories[1]  
a11yCategory = categories[2]  
  
node.annotations = [  
  {  
    label: 'Pressing activates animation',  
    categoryId: interactionCategory.id,  
  },  
  {  
    label: 'Fill in aria-label with i18n string',  
    categoryId: a11yCategory.id,  
  },  
]  
  
// Clear an annotation  
node.annotations = []
```

[Previous

ActiveUser](ActiveUser.md)[Next

AnnotationCategory](AnnotationCategory.md)

- [Annotation properties](#annotation-properties)
- [Annotation node properties](#annotation-node-properties)
- [Example usage](#example-usage)
