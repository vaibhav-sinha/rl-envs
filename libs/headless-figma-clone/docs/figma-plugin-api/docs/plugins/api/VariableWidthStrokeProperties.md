<!-- source: https://developers.figma.com/docs/plugins/api/VariableWidthStrokeProperties -->

- Plugins
- [Data Types](data-types.md)
- VariableWidthStrokeProperties

On this page

For nodes using variable width strokes, [`node.variableWidthStrokeProperties`](node-properties.md#variablewidthstrokeproperties) can be used to get and set the stroke's width profile. There are two types of variable width stroke properties: preset profiles and custom profiles.

```
type VariableWidthStrokeProperties =  
  | PresetVariableWidthStrokeProperties  
  | CustomVariableWidthStrokeProperties
```

### Preset Variable Width Stroke Properties[​](#preset-variable-width-stroke-properties "Direct link to Preset Variable Width Stroke Properties")

The available preset width profiles are:

| Profile Name | Description | Image |
| --- | --- | --- |
| `UNIFORM` | Constant width | Uniform stroke profile |
| `WEDGE` | Tapers from the full width of the stroke to a single point | Wedge stroke profile |
| `TAPER` | Tapers from the full width of the stroke to 1/4 of the width | Taper stroke profile |
| `QUARTER_TAPER` | Starts at 1/4 of the width of the stroke, grows to full width 1/4 of the way along the path, then shrinks to 1/4 of the width | Quarter Taper stroke profile |
| `EYE` | Tapers to a point at both ends and is full width in center | Eye stroke profile |
| `MIRRORED_TAPER` | Tapers from 1/4 of the width at both ends and is full width in the center | Mirrored Taper stroke profile |

### widthProfile: 'UNIFORM' | 'WEDGE' | 'TAPER' | 'QUARTER\_TAPER' | 'EYE' | 'MIRRORED\_TAPER'

The width profile of the stroke.

---

### Custom Variable Width Stroke Properties[​](#custom-variable-width-stroke-properties "Direct link to Custom Variable Width Stroke Properties")

For nodes with a custom variable width stroke profile, the `variableWidthPoints` property defines an array of `VariableWidthPoint` objects and the `widthProfile` property is fixed to `'CUSTOM'`. Each `VariableWidthPoint` specifies a position along the stroke (from 0 to 1) and the width, as a fraction of the overall stroke weight, at that position.

#### Example[​](#example "Direct link to Example")

```
node.variableWidthStrokeProperties = {  
  widthProfile: 'CUSTOM',  
  variableWidthPoints: [  
    { position: 0, width: 0.5 },  
    { position: 0.2, width: 1 },  
    { position: 1, width: 0.5 },  
  ],  
}
```

### widthProfile: 'CUSTOM'

The width profile of the stroke. Fixed to 'CUSTOM'.

---

### variableWidthPoints: ReadonlyArray<[VariableWidthPoint](VariableWidthStrokeProperties.md#variable-width-point)>

An array of variable width points defining the custom width profile.

---

### VariableWidthPoint[​](#variablewidthpoint "Direct link to VariableWidthPoint")

### position: number

The position of the variable width point along the stroke, from 0 (the start of the stroke) to 1 (the end of the stroke).

---

### width: number

The width of the stroke at this variable width point as a fraction of the stroke weight.

---

[Previous

LibraryVariableCollection](LibraryVariableCollection.md)[Next

VectorPath](VectorPath.md)

- [Preset Variable Width Stroke Properties](#preset-variable-width-stroke-properties)
- [Custom Variable Width Stroke Properties](#custom-variable-width-stroke-properties)
- [VariableWidthPoint](#variablewidthpoint)
