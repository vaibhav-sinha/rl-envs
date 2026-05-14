<!-- source: https://developers.figma.com/docs/widgets/api/type-Constraint -->

- Widgets
- Data Types
- Constraint

On this page

## `VerticalConstraint`[​](#verticalconstraint "Direct link to verticalconstraint")

```
type VerticalConstraint =  
  | TopConstraint  
  | BottomConstraint  
  | TopBottomConstraint  
  | CenterConstraint  
  | VerticalScaleConstraint  
  
export interface TopConstraint {  
  type: 'top'  
  offset: number  
}  
  
export interface BottomConstraint {  
  type: 'bottom'  
  offset: number  
}  
  
export interface TopBottomConstraint {  
  type: 'top-bottom'  
  topOffset: number  
  bottomOffset: number  
}  
  
export interface CenterConstraint {  
  type: 'center'  
  offset: number  
}  
  
export interface VerticalScaleConstraint {  
  type: 'vertical-scale'  
  topOffsetPercent: number  
  bottomOffsetPercent: number  
}
```

## `HorizontalConstraint`[​](#horizontalconstraint "Direct link to horizontalconstraint")

```
type HorizontalConstraint =  
  | LeftConstraint  
  | RightConstraint  
  | LeftRightConstraint  
  | CenterConstraint  
  | HorizontalScaleConstraint  
  
export interface LeftConstraint {  
  type: 'left'  
  offset: number  
}  
  
export interface RightConstraint {  
  type: 'right'  
  offset: number  
}  
  
export interface LeftRightConstraint {  
  type: 'left-right'  
  leftOffset: number  
  rightOffset: number  
}  
  
export interface CenterConstraint {  
  type: 'center'  
  offset: number  
}  
  
export interface HorizontalScaleConstraint {  
  type: 'horizontal-scale'  
  leftOffsetPercent: number  
  rightOffsetPercent: number  
}
```

[Previous

Color](type-Color.md)[Next

CornerRadius](type-CornerRadius.md)

- [`VerticalConstraint`](#verticalconstraint)
- [`HorizontalConstraint`](#horizontalconstraint)
