<!-- source: https://developers.figma.com/docs/plugins/api/LineHeight -->

- Plugins
- [Data Types](data-types.md)
- LineHeight

```
type LineHeight = {  
  readonly value: number  
  readonly unit: "PIXELS" | "PERCENT"  
} | {  
  readonly unit: "AUTO"  
}
```

An object representing a number with a unit. This is similar to how you can set either `100%` or `100px` in a lot of CSS properties. It can also be set to `AUTO`.

[Previous

LetterSpacing](LetterSpacing.md)[Next

LinkUnfurlData](LinkUnfurlData.md)
