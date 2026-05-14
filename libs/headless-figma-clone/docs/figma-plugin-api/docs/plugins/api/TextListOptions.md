<!-- source: https://developers.figma.com/docs/plugins/api/TextListOptions -->

- Plugins
- [Data Types](data-types.md)
- TextListOptions

```
type TextListOptions = {  
    type: "ORDERED" | "UNORDERED" | "NONE"  
}
```

An object describing list settings for a range of text. The possible values for `type` are:

- `"ORDERED"`: if the text range has been set to be part of an ordered list (ie: list with numerical counter).
- `"UNORDERED"`: if the text range has been set to be part of an unordered list (ie: bulleted list).
- `"NONE"`: if the text range is plain text and is not part of any list

[Previous

TextDecorationColor](TextDecorationColor.md)[Next

TextPathStartData](TextPathStartData.md)
