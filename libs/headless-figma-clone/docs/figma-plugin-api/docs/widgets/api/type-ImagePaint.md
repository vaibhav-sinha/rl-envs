<!-- source: https://developers.figma.com/docs/widgets/api/type-ImagePaint -->

- Widgets
- Data Types
- ImagePaint

```
interface ImagePaint extends PaintProps {  
  type: 'image'  
  src: string  
  imageSize?: { width: number; height: number }  
  scaleMode?: ScaleMode  
  imageTransform?: Transform  
  scalingFactor?: number  
  rotation?: number  
}  
  
type ScaleMode = 'fill' | 'fit' | 'tile' | 'crop'  
  
type Transform = [[number, number, number], [number, number, number]]
```

### type: 'image'

The string literal "image".

---

### src: string

An Image URL or DataURI encoding the image.

---

### imageSize?: { width: number; height: number }

The size of the image.

---

### scaleMode?: ScaleMode

How the image is positioned and scaled within the layer.

---

### imageTransform?: [Transform](type-Transform.md#transform)

Applicable only for `scaleMode == "crop"`. Determines how the image is positioned (thus, cropped) within the layer.

---

### scalingFactor?: number

Applicable only for `scaleMode == "tile"` (automatic for other modes). Determines the scaling (thus, repetition) of the image within the layer.

---

### rotation?: number

Applicable only for `scaleMode == "tile" | "fill" | "fit"` (automatic for `scaleMode == "CROP"`). Determines the rotation of the image within the layer. Must be in increments of +90.

---

[Previous

HoverStyle](type-HoverStyle.md)[Next

LayoutGap](type-LayoutGap.md)
