<!-- source: https://developers.figma.com/docs/widgets/api/type-AlignItems -->

- Widgets
- Data Types
- AlignItems

On this page

Determines how the AutoLayout frame’s children should be aligned in primary/counter axis direction.

```
type AlignItems = 'center' | 'start' | 'end' | 'baseline'
```

## Remarks[​](#remarks "Direct link to Remarks")

- `"start"` and `"end"` correspond to:
  - left and right respectively for AutoLayout frames with "horizontal" direction.
  - top and bottom respectively for AutoLayout frames with "vertical" direction.
- `"baseline"` can only be set on horizontal AutoLayout frames, and aligns all children along the text baseline.

[Previous

Fragment](component-Fragment.md)[Next

ArcData](type-ArcData.md)

- [Remarks](#remarks)
