<!-- source: https://developers.figma.com/docs/plugins/api/Constraints -->

- Plugins
- [Data Types](data-types.md)
- Constraints

```
interface Constraints {  
  readonly horizontal: ConstraintType  
  readonly vertical: ConstraintType  
}
```

The resizing behavior of a layer when its containing frame is resized.

```
type ConstraintType = "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE"
```

The possible values of the resizing behavior of a layer when its containing frame is resized. In the UI, these are referred to as:

- "MIN": Left or Top
- "MAX": Right or Bottom
- "CENTER": Center
- "STRETCH": Left & Right or Top & Bottom
- "SCALE": Scale

[Previous

ConnectorStrokeCap](ConnectorStrokeCap.md)[Next

ComponentProperties](ComponentProperties.md)
