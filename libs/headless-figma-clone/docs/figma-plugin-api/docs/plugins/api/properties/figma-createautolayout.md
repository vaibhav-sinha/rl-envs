<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createautolayout -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createAutoLayout

On this page

info

This API is only available via `use_figma` in the MCP server

Creates a new frame with auto layout already enabled. Both axes default to hug content
(`primaryAxisSizingMode = "AUTO"`, `counterAxisSizingMode = "AUTO"`), so children can
immediately use `layoutSizingHorizontal/Vertical = "FILL"` after being appended.

## Signature[​](#signature "Direct link to Signature")

### [createAutoLayout](figma-createautolayout.md)(direction?: 'HORIZONTAL' | 'VERTICAL'): [FrameNode](../FrameNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

Prefer this over `createFrame()` whenever you need an auto-layout parent. Since `layoutMode` is
already set, children can use `FILL` sizing immediately after being appended.

The default direction is `"HORIZONTAL"`. Pass `"VERTICAL"` for a column layout.

Create an auto-layout frame

```
const row = figma.createAutoLayout()  
const column = figma.createAutoLayout("VERTICAL")  
  
row.itemSpacing = 16  
row.paddingTop = 24  
row.paddingBottom = 24  
row.paddingLeft = 24  
row.paddingRight = 24
```

[Previous

createFrame](figma-createframe.md)[Next

createComponent](figma-createcomponent.md)

- [Signature](#signature)
- [Remarks](#remarks)
