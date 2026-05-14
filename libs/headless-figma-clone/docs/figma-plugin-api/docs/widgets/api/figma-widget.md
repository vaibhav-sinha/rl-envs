<!-- source: https://developers.figma.com/docs/widgets/api/figma-widget -->

- Widgets
- Global Objects
- figma.widget

### figma.widget

### [register](properties/widget-register.md)(component: FunctionalWidget<any>): void

Used to register your widget. **This is the main entry point to widgets.**

This function expects a widget function that describes the widget and returns a Figma element
(eg. one of the components AutoLayout, Frame, Text etc).

[View more →](properties/widget-register.md)

---

### [useWidgetId](properties/widget-usewidgetid.md)(): string

The `useWidgetId` hook gives you a way to reference the active widget node in event handlers like `onClick`. It returns a node `id` which can be used to retrieve and identify the active WidgetNode via the plugin API (eg. `figma.getNodeById`).

[View more →](properties/widget-usewidgetid.md)

---

### [useSyncedState](properties/widget-usesyncedstate.md)<T>(name: string, defaultValue: T | (() => T)): [T, (newValue: T | ((currValue: T) => T)) => void]

The `useSyncedState` hook lets you declare that your widget relies on some state. You give `useSyncedState` a storage key and a default value and it returns the current value stored and a function to update the value.

[View more →](properties/widget-usesyncedstate.md)

---

### [useSyncedMap](properties/widget-usesyncedmap.md)<T>(name: string): [SyncedMap](type-SyncedMap.md#synced-map)<T>

The `useSyncedMap` hook works similarly to `useSyncedState`, but each value within the map is updated last-writer-wins, instead of the entire map being overwritten last-writer-wins.

[View more →](properties/widget-usesyncedmap.md)

---

### [usePropertyMenu](properties/widget-usepropertymenu.md)(items: [WidgetPropertyMenuItem](type-PropertyMenu.md#widget-property-menu-item)[], onChange: (event: [WidgetPropertyEvent](type-PropertyMenu.md#widget-property-event)) => void | Promise<void>): void

The `usePropertyMenu` hook lets you specify the property menu to show when the widget is selected (See image below).

[View more →](properties/widget-usepropertymenu.md)

---

### [useEffect](properties/widget-useeffect.md)(effect: () => (() => void) | void): void

The `useEffect` hook can be useful for running code that should run anytime the state of a widget changes or a widget is interacted with. You can use it to do data fetching when a component mounts (by using it with `waitForTask` ) or keeping state in sync between an iframe and the widget.

[View more →](properties/widget-useeffect.md)

---

### [useStickable](properties/widget-usestickable.md)(onStuckStatusChanged?: (e: [WidgetStuckEvent](type-WidgetStuckEvent.md#widget-stuck-event)) => void | Promise<void>): void

info

This API is only available in FigJam

`useStickable` is a hook that makes your widget stick to other nodes when dragged over them. This behavior is similar to how stamp nodes work in Figma.

[View more →](properties/widget-usestickable.md)

---

### [useStickableHost](properties/widget-usestickablehost.md)(onAttachmentsChanged?: (e: [WidgetAttachedStickablesChangedEvent](type-WidgetAttachedStickablesChangedEvent.md#widget-attached-stickables-changed-event)) => void | Promise<void>): void

info

This API is only available in FigJam

`useStickableHost` lets your widget run a callback when a stickable is added or removed to your widget. By default all widgets are already stickable hosts so you don't have to call this if you just want stamps to stick to your widget.

[View more →](properties/widget-usestickablehost.md)

---

### [waitForTask](properties/widget-waitfortask.md)(task: Promise<any>): void

The `waitForTask` function is useful for doing asynchronous work (eg. data fetching) in `useEffect`. It takes a promise and keeps the widget alive until the promise is resolved (or if there’s an explicit call to `figma.closePlugin`).

[View more →](properties/widget-waitfortask.md)

---

### [colorMapToOptions](properties/widget-colormaptooptions.md)(colorPalette: { [key: string]: string }): WidgetPropertyMenuColorSelectorOption[]

info

This API is only available in FigJam

The `colorMapToOptions` takes in a [ColorPalette](../../plugins/api/ColorPalette.md), a map from color names to values, and returns `WidgetPropertyMenuColorSelectorOption[]`. This helper function enables developers to use `figma.constants.colors.*`, official FigJam color palettes, in the `PropertyMenu`.

[View more →](properties/widget-colormaptooptions.md)

---

[Previous

The Typings File](typings.md)[Next

register](properties/widget-register.md)
