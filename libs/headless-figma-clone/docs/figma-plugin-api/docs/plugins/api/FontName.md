<!-- source: https://developers.figma.com/docs/plugins/api/FontName -->

- Plugins
- [Data Types](data-types.md)
- FontName

```
interface Font {  
  fontName: FontName  
}  
  
interface FontName {  
  readonly family: string  
  readonly style: string  
}
```

Describes a font used by a text node. For example, the default font is `{ family: "Inter", style: "Regular" }`.

[Previous

FindAllCriteria](FindAllCriteria.md)[Next

FontStyle](FontStyle.md)
