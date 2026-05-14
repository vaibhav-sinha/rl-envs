<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-util-normalizemarkdown -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [util](../figma-util.md)
- normalizeMarkdown

On this page

Normalizes the markdown string to verify what markdown will render with Figma's rich-text editors.

Examples:

```
const md = "# Hello, world!\n\nThis is a **bold** text."  
const normalizedMd = figma.util.normalizeMarkdown(md);  
  
// Set an component description with descriptionMarkdown  
component.descriptionMarkdown = normalizedMd;
```

## Signature[​](#signature "Direct link to Signature")

### normalizeMarkdown(markdown: string): string

## Parameters[​](#parameters "Direct link to Parameters")

### markdown[​](#markdown "Direct link to markdown")

A markdown string to normalize.

[Previous

solidPaint](figma-util-solidpaint.md)[Next

constants](../figma-constants.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [markdown](#markdown)
