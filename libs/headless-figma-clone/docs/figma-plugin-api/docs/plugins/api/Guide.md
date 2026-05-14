<!-- source: https://developers.figma.com/docs/plugins/api/Guide -->

- Plugins
- [Data Types](data-types.md)
- Guide

```
interface Guide {  
  readonly axis: "X" | "Y"  
  readonly offset: number  
}
```

Guides are either a horizontal (Y-axis) or vertical straight (X-axis) line. The offset determines its position relative to the node it is stored in (usually either the canvas or a frame).

[Previous

FontStyle](FontStyle.md)[Next

GridTrackSize](GridTrackSize.md)
