<!-- source: https://developers.figma.com/docs/plugins/api/figma-annotations -->

- Plugins
- [Global Objects](global-objects.md)
- [figma](figma.md)
- annotations

These are all defined on `figma.annotations`.

### getAnnotationCategoriesAsync(): Promise<[AnnotationCategory](AnnotationCategory.md)[]>

Returns a list of all [`AnnotationCategory`](AnnotationCategory.md)s that exist in the current file.

---

### getAnnotationCategoryByIdAsync(id: string): Promise<[AnnotationCategory](AnnotationCategory.md) | null>

Returns an [`AnnotationCategory`](AnnotationCategory.md) by its ID. If not found, returns a promise containing null.

[View more →](properties/figma-annotations-getannotationcategorybyidasync.md)

---

### addAnnotationCategoryAsync(categoryInput: { label: string; color: [AnnotationCategoryColor](AnnotationCategoryColor.md) }): Promise<[AnnotationCategory](AnnotationCategory.md)>

Adds a new [`AnnotationCategory`](AnnotationCategory.md).

[View more →](properties/figma-annotations-addannotationcategoryasync.md)

---

[Previous

getVariablesInLibraryCollectionAsync](properties/figma-teamlibrary-getvariablesinlibrarycollectionasync.md)[Next

getAnnotationCategoryByIdAsync](properties/figma-annotations-getannotationcategorybyidasync.md)
