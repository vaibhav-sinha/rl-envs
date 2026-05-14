<!-- source: https://developers.figma.com/docs/widgets/api/type-GradientPaint -->

- Widgets
- Data Types
- GradientPaint

On this page

```
interface GradientPaint extends PaintProps {  
  type: 'gradient-linear' |  
        'gradient-radial' |  
        'gradient-angular' |  
        'gradient-diamond'  
  
  gradientHandlePositions: [Vector, Vector, Vector]  
  gradientStops: ColorStop[]  
}  
  
interface ColorStop {  
  position: number  
  color: Color  
}  
  
interface Vector {  
  x: number  
  y: number  
}
```

### type: 'gradient-linear' | 'gradient-radial' | 'gradient-angular' | 'gradient-diamond'

The type of gradient paint.

---

### gradientHandlePositions: [Vector, Vector, Vector]

The positioning of the gradient within the layer.

This field contains three vectors, each of which are a position in normalized object space (normalized object space is if the top left corner of the bounding box of the object is (0, 0) and the bottom right is (1,1)).

1. The first position corresponds to the start of the gradient (value 0 for the purposes of calculating gradient stops)
2. The second position is the end of the gradient (value 1)
3. The third position determines the width of the gradient.

---

### gradientStops: ColorStop[]

Array of colors and their position within the gradient.

---

## Examples[​](#examples "Direct link to Examples")

### Gradient Linear[​](#gradient-linear "Direct link to Gradient Linear")

![Gradient Linear](/assets/images/gradient-linear-0a54d34856d32b57e95cd3c5f50d0b70.png)

```
  <Rectangle  
    width={100}  
    height={100}  
    fill={{  
      type: "gradient-linear",  
      gradientHandlePositions: [  
        { x: 0, y: 0.5 },  
        { x: 1, y: 1 },  
        { x: 0, y: 0 }  
      ],  
      gradientStops: [  
        { position: 0, color: { r: 1, g: 0.4, b: 0.4, a: 1 } },  
        { position: 1, color: { r: 1, g: 0.7, b: 0.4, a: 1 } }  
      ]  
    }}  
    cornerRadius={8}  
  />
```

### Gradient Radial[​](#gradient-radial "Direct link to Gradient Radial")

![Gradient Radial](/assets/images/gradient-radial-edff8adb3f50e8a42b466a1d0d033663.png)

```
  <Rectangle  
    width={100}  
    height={100}  
    fill={{  
      type: "gradient-radial",  
      gradientHandlePositions: [  
        { x: 0.5, y: 0.5 },  
        { x: 0.5, y: 1 },  
        { x: 1, y: 0.5 }  
      ],  
      gradientStops: [  
        { position: 0, color: { r: 1, g: 0.4, b: 0.4, a: 1 } },  
        { position: 1, color: { r: 1, g: 0.7, b: 0.4, a: 1 } }  
      ]  
    }}  
    cornerRadius={8}  
  />
```

### Gradient Angular[​](#gradient-angular "Direct link to Gradient Angular")

![Gradient Angular](/assets/images/gradient-angular-34d1b5cd8ccb60afd179952a38a17fc7.png)

```
  <Rectangle  
    width={100}  
    height={100}  
    fill={{  
      type: "gradient-angular",  
      gradientHandlePositions: [  
        { x: 0.5, y: 0.5 },  
        { x: 1, y: 0.5 },  
        { x: 0.5, y: 1 }  
      ],  
      gradientStops: [  
        { position: 0, color: { r: 1, g: 0.4, b: 0.4, a: 1 } },  
        { position: 1, color: { r: 1, g: 0.7, b: 0.4, a: 1 } }  
      ]  
    }}  
    cornerRadius={8}  
  />
```

### Gradient Diamond[​](#gradient-diamond "Direct link to Gradient Diamond")

![Gradient Diamond](/assets/images/gradient-diamond-367d343c76fc3ecfcec8e3fda07ea5ed.png)

```
  <Rectangle  
    width={100}  
    height={100}  
    fill={{  
      type: "gradient-diamond",  
      gradientHandlePositions: [  
        { x: 0.5, y: 0.5 },  
        { x: 0.5, y: 1 },  
        { x: 1, y: 0.5 }  
      ],  
      gradientStops: [  
        { position: 0, color: { r: 1, g: 0.4, b: 0.4, a: 1 } },  
        { position: 1, color: { r: 1, g: 0.7, b: 0.4, a: 1 } }  
      ]  
    }}  
    cornerRadius={8}  
  />
```

[Previous

FontWeight](type-FontWeight.md)[Next

HoverStyle](type-HoverStyle.md)

- [Examples](#examples)
  - [Gradient Linear](#gradient-linear)
  - [Gradient Radial](#gradient-radial)
  - [Gradient Angular](#gradient-angular)
  - [Gradient Diamond](#gradient-diamond)
