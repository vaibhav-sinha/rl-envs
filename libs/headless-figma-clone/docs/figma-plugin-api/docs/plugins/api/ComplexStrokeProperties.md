<!-- source: https://developers.figma.com/docs/plugins/api/ComplexStrokeProperties -->

- Plugins
- [Data Types](data-types.md)
- ComplexStrokeProperties

On this page

For nodes using brush or dynamic strokes, [`node.complexStrokeProperties`](node-properties.md#complexstrokeproperties) describes the properties of these stroke types. Nodes that do not use brush or dynamic strokes will have `complexStrokeProperties` set to `{type: 'BASIC'}`.

```
type ComplexStrokeProperties =  
  | { type: 'BASIC' }  
  | BrushStrokeProperties  
  | DynamicStrokeProperties
```

## Brush Strokes[​](#brush-strokes "Direct link to Brush Strokes")

For nodes with brush strokes, [`node.complexStrokeProperties`](node-properties.md#complexstrokeproperties) will have the type `BRUSH`. There are two types of brushes: stretch brushes and scatter brushes. Stretch brushes stretch a brush pattern along the length of the stroke, while scatter brushes scatter brush shapes along the stroke path. Stretch and scatter brushes each have their own set of properties.

When setting a brush on a stroke, you must first ensure that the desired brush-type brushes are loaded with [`figma.loadBrushesAsync()`](properties/figma-loadbrushesasync.md). This function only needs to be called once per plugin session; after the brushes are loaded, they can be used on any number of nodes.

### Stretch Brushes[​](#stretch-brushes "Direct link to Stretch Brushes")

Stretch brush strokes have `type: 'BRUSH'` and `brushType: 'STRETCH'` with the following additional properties:

### brushName: 'HEIST' | 'BLOCKBUSTER' | 'GRINDHOUSE' | 'BIOPIC' | 'SPAGHETTI\_WESTERN' | 'SLASHER' | 'HARDBOILED' | 'VERITE' | 'EPIC' | 'SCREWBALL' | 'ROM\_COM' | 'NOIR' | 'PROPAGANDA' | 'MELODRAMA' | 'NEW\_WAVE' | 'CUSTOM'

Name of the stretch brush. See the [available brushes](ComplexStrokeProperties.md#available-brushes) for previews of these brushes.
Nodes using custom brushes will have this set to 'CUSTOM'. However, setting this property to 'CUSTOM' is not yet supported.

---

### direction: 'FORWARD' | 'BACKWARD'

The direction of the brush

---

### Scatter Brushes[​](#scatter-brushes "Direct link to Scatter Brushes")

Scatter brush strokes have `type: 'BRUSH'` and `brushType: 'SCATTER'` with the following additional properties:

### brushName: 'BUBBLEGUM' | 'WITCH\_HOUSE' | 'SHOEGAZE' | 'HONKY\_TONK' | 'SCREAMO' | 'DRONE' | 'DOO\_WOP' | 'SPOKEN\_WORD' | 'VAPORWAVE' | 'OI' | 'CUSTOM'

Name of the scatter brush. See the [available brushes](ComplexStrokeProperties.md#available-brushes) for previews of these brushes.
Nodes using custom brushes will have this set to 'CUSTOM'. However, setting this property to 'CUSTOM' is not yet supported.

---

### gap: number

Gap between brush instances along the stroke path. Minimum value is 0.25

---

### wiggle: number

The amount of random movement applied to brush instances along the stroke path. The minimum value is 0.

---

### sizeJitter: number

The amount of random size variation applied to brush instances. Ranges from 0 to 3.

---

### angularJitter: number

The amount of random angular variation in degrees applied to brush instances. Ranges from -180 to 180.

---

### rotation: number

The rotation in degrees applied to brush instances. Ranges from -180 to 180.

---

### Custom brushes[​](#custom-brushes "Direct link to Custom brushes")

Setting custom brushes in the plugin API is not yet supported. However, if an existing node uses a custom brush, [`node.complexStrokeProperties`](node-properties.md#complexstrokeproperties) will return the brush name `CUSTOM` along with the relevant brush properties.

### Available brushes[​](#available-brushes "Direct link to Available brushes")

#### Stretch brushes[​](#stretch-brushes-1 "Direct link to Stretch brushes")

| Brush name | Image |
| --- | --- |
| `HEIST` | HEIST brush |
| `BLOCKBUSTER` | BLOCKBUSTER brush |
| `GRINDHOUSE` | GRINDHOUSE brush |
| `BIOPIC` | BIOPIC brush |
| `SPAGHETTI_WESTERN` | SPAGHETTI_WESTERN brush |
| `SLASHER` | SLASHER brush |
| `HARDBOILED` | HARDBOILED brush |
| `VERITE` | VERITE brush |
| `EPIC` | EPIC brush |
| `SCREWBALL` | SCREWBALL brush |
| `ROM_COM` | ROM_COM brush |
| `NOIR` | NOIR brush |
| `PROPAGANDA` | PROPAGANDA brush |
| `MELODRAMA` | MELODRAMA brush |
| `NEW_WAVE` | NEW_WAVE brush |

#### Scatter brushes[​](#scatter-brushes-1 "Direct link to Scatter brushes")

| Brush name | Image |
| --- | --- |
| `BUBBLEGUM` | BUBBLEGUM brush |
| `WITCH_HOUSE` | WITCH_HOUSE brush |
| `SHOEGAZE` | SHOEGAZE brush |
| `HONKY_TONK` | HONKY_TONK brush |
| `SCREAMO` | SCREAMO brush |
| `DRONE` | DRONE brush |
| `DOO_WOP` | DOO_WOP brush |
| `SPOKEN_WORD` | SPOKEN_WORD brush |
| `VAPORWAVE` | VAPORWAVE brush |
| `OI` | OI brush |

## Dynamic Strokes[​](#dynamic-strokes "Direct link to Dynamic Strokes")

For nodes with dynamic strokes, [`node.complexStrokeProperties`](node-properties.md#complexstrokeproperties) will have the type `DYNAMIC`, along with the following additional properties:

### type: 'DYNAMIC'

The type of complex stroke. Fixed to 'DYNAMIC'.

---

### frequency: number

The frequency of the dynamic stroke. Ranges from 0.01 to 20.

---

### wiggle: number

The amplitude of the wiggles in the dynamic stroke. Minimum value is 0.

---

### smoothen: number

The amount of smoothing applied to the dynamic stroke. Ranges from 0 to 1.

---

[Previous

ColorPalettes](ColorPalettes.md)[Next

ConnectorEndpoint](ConnectorEndpoint.md)

- [Brush Strokes](#brush-strokes)
  - [Stretch Brushes](#stretch-brushes)
  - [Scatter Brushes](#scatter-brushes)
  - [Custom brushes](#custom-brushes)
  - [Available brushes](#available-brushes)
- [Dynamic Strokes](#dynamic-strokes)
