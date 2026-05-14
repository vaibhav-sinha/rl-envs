<!-- source: https://developers.figma.com/docs/widgets/api/type-ArcData -->

- Widgets
- Data Types
- ArcData

```
type ArcData = {  
  readonly startingAngle: number  
  readonly endingAngle: number  
  readonly innerRadius: number  
}
```

This data controls the "arc" properties of the [`Ellipse`](component-Ellipse.md) component:

![](https://static.figma.com/uploads/abd31088233f035d829a22d99a4e481263f5db68)

The angles are in radians and the inner radius value is from 0 to 1. For the angles, 0° is the x axis and increasing angles rotate clockwise.

Examples:

Half-circle

```
// Make a half-circle  
<Ellipse  
  arcData={{  
  	startingAngle: 0,  
  	endingAngle: Math.PI,  
  	innerRadius: 0  
  }}  
/>
```

Donut

```
// Make a donut  
<Ellipse  
  arcData={{  
  	startingAngle: 0,  
  	endingAngle: 2 * Math.PI,  
  	innerRadius: 0.5  
  }}  
/>
```

[Previous

AlignItems](type-AlignItems.md)[Next

BlendMode](type-BlendMode.md)
