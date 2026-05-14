<!-- source: https://developers.figma.com/docs/plugins/api/SlidesViewChangeEvent -->

- Plugins
- [Data Types](data-types.md)
- SlidesViewChangeEvent

This event is triggered when the user toggles between grid view and single slide view in Figma Slides.

```
interface SlidesViewChangeEvent {  
  view: 'GRID' | 'SINGLE_SLIDE'  
}
```

To read the current view, use the [`figma.viewport.slidesView`](properties/figma-viewport-slidesview.md) property.

[Previous

SlideTransition](SlideTransition.md)[Next

StrokeCap](StrokeCap.md)
