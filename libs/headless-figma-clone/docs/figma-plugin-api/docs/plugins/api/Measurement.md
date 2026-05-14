<!-- source: https://developers.figma.com/docs/plugins/api/Measurement -->

- Plugins
- [Data Types](data-types.md)
- Measurement

On this page

Measurements can be added between nodes in Dev Mode to highlight distances.

Measurements can only be added between the following node types: [ComponentNode](ComponentNode.md), [ComponentSetNode](ComponentSetNode.md), [EllipseNode](EllipseNode.md), [FrameNode](FrameNode.md), [InstanceNode](InstanceNode.md), [LineNode](LineNode.md), [PolygonNode](PolygonNode.md), [RectangleNode](RectangleNode.md), [StarNode](StarNode.md), [TextNode](TextNode.md), [VectorNode](VectorNode.md).

You can read, add, edit and remove measurements by using the measurement methods on a [PageNode](PageNode.md).

The value of the measurement displayed can be overridden with the `freeText` field.

## Measurement properties[​](#measurement-properties "Direct link to Measurement properties")

```
interface Measurement {  
  id: string  
  start: { node: SceneNode; side: MeasurementSide }  
  end: { node: SceneNode; side: MeasurementSide }  
  offset: MeasurementOffset  
  freeText: string  
}
```

See [MeasurementSide](MeasurementSide.md) and [MeasurementOffset](MeasurementOffset.md) for supported values.

## Page node properties[​](#page-node-properties "Direct link to Page node properties")

### getMeasurements(): [Measurement](Measurement.md)[]

Get all measurements in the current page.

Learn more about measurements in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935).

---

### getMeasurementsForNode(node: [SceneNode](nodes.md#scene-node)): [Measurement](Measurement.md)[]

Get all measurements pointing to a node in the current page. This includes all measurements whose start *or* end node is the node passed in.

---

### addMeasurement(start: { node: [SceneNode](nodes.md#scene-node); side: [MeasurementSide](MeasurementSide.md) }, end: { node: [SceneNode](nodes.md#scene-node); side: [MeasurementSide](MeasurementSide.md) }, options?: { offset: [MeasurementOffset](MeasurementOffset.md); freeText: string }): [Measurement](Measurement.md)

Adds a measurement between two nodes in the current page.

Measurements are always between a start and end node. The side indicates which edge of the node to draw the measurement from.

Measurements can only go on the same axis, i.e. from side `"LEFT"` -> `"LEFT"`, `"LEFT"` -> `"RIGHT"`, `"TOP"` -> `"BOTTOM"` etc. But not `"LEFT"` -> `"TOP"`.

See the [Measurement type](Measurement.md) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}
```

---

### editMeasurement(id: string, newValue: { offset: [MeasurementOffset](MeasurementOffset.md); freeText: string }): [Measurement](Measurement.md)

Edit a measurement’s offset.

See the [Measurement type](Measurement.md) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}
```

---

### deleteMeasurement(id: string): void

Delete a measurement.

See the [Measurement type](Measurement.md) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}
```

---

## Example usage[​](#example-usage "Direct link to Example usage")

```
const [frame1, frame2] = figma.currentPage.children  
  
// Add a measurement  
const measurement1 =  
  figma.currentPage.addMeasurement(  
    { node: frame1, side: 'RIGHT' },  
    { node: frame2, side: 'LEFT' }  
  )  
  
// Edit the measurement's offset to be at the bottom of frame1 on the canvas  
const editedMeasurement1 =  
  figma.currentPage.editMeasurement(  
    measurement1.id,  
    { offset: { type: 'INNER', relative: 1 } }  
  )  
  
// Add a measurement with an offset of 10 above frame2 on the canvas  
const measurement2 =  
  figma.currentPage.addMeasurement(  
    { node: frame2, side: 'LEFT' },  
    { node: frame1, side: 'RIGHT' },  
    { offset: { type: 'OUTER', fixed: -10 } }  
  )  
  
// Override the value shown in the measurement to show '100%'  
const editedMeasurement2 =  
  figma.currentPage.editMeasurement(  
    measurement2.id,  
    { freeText: '100%' }  
  )  
  
// Delete a measurement  
figma.currentPage.deleteMeasurement(measurement2.id)
```

[Previous

MaskType](MaskType.md)[Next

MeasurementOffset](MeasurementOffset.md)

- [Measurement properties](#measurement-properties)
- [Page node properties](#page-node-properties)
- [Example usage](#example-usage)
