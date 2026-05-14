<!-- source: https://developers.figma.com/docs/plugins/api/AnnotationCategory -->

- Plugins
- [Data Types](data-types.md)
- AnnotationCategory

On this page

## AnnotationCategory properties[​](#annotationcategory-properties "Direct link to AnnotationCategory properties")

An `AnnotationCategory` is a way to distinguish your [Annotations](Annotation.md). Categories can be given a color and a custom label. This helps different audiences consuming Annotations, for example developers or copy writers, find the Annotations most relevant to their work.

### id: string [readonly]

The unique identifier of the annotation category.

---

### label: string [readonly]

The label of the annotation category.

---

### color: [AnnotationCategoryColor](AnnotationCategoryColor.md) [readonly]

The color of the annotation category.

---

### isPreset: boolean [readonly]

Whether this annotation category is a preset.

---

### remove(): void

Removes this annotation category from the document.

---

### setColor(color: [AnnotationCategoryColor](AnnotationCategoryColor.md)): void

Sets the color of the annotation category.

---

### setLabel(label: string): void

Sets the label of the annotation category.

---

[Previous

Annotation](Annotation.md)[Next

AnnotationCategoryColor](AnnotationCategoryColor.md)

- [AnnotationCategory properties](#annotationcategory-properties)
