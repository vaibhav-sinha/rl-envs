<!-- source: https://developers.figma.com/docs/widgets/undo-redo -->

- Widgets
- Development Guides
- Undo/Redo for Widgets

On this page

Undo/Redo works differently for widgets compared to regular FigJam/Figma objects because ultimately, a widget is simply a rendered version of its synced state. When a user performs an undo/redo action, the widget's state is updated accordingly and the widget re-renders to reflect the new state.

## How this works[​](#how-this-works "Direct link to How this works")

Each user has their own undo / redo stack, which will keep track of changes to [`useSyncedState`](api/properties/widget-usesyncedstate.md) and [`useSyncedMap`](api/properties/widget-usesyncedmap.md) variables. You can think of these synced variables as stored in one big mapping.

For example, if your widget uses the following hooks:

Undo / redo widget example

```
const { widget } = figma  
const { AutoLayout, useSyncedState, useSyncedMap } = widget  
  
function UndoWidget() {  
  const [count, setCount] = useSyncedState("count", 0)  
  const [countMap] = useSyncedMap("countMap")  
  
  return (  
    <AutoLayout  
      onClick={() => {  
        countMap.set("userA", 1)  
        countMap.set("userB", 2)  
      }}  
    >  
      {String(count)}  
    </AutoLayout>  
  )  
}  
  
figma.widget.register(UndoWidget)
```

This mapping can be visualized as follows (after the user clicks on the widget):

Synced state mapping

```
{  
  "count": 0,  
  "countMap-userA": 1,  
  "countMap-userB": 2  
}
```

When a user interacts with a widget that causes a change to a synced variable, we determine what changed and instead of that, push the inverse of the change onto the stack. If the user then takes an "undo" action, we pop the values from the stack, apply the changes to the existing mapping, and re-render the widget.

## Counter Widget Example[​](#counter-widget-example "Direct link to Counter Widget Example")

### A basic counter with 1 user[​](#a-basic-counter-with-1-user "Direct link to A basic counter with 1 user")

Let’s say the counter widget is implemented with single [`useSyncedState`](api/properties/widget-usesyncedstate.md) hook:

caution

⚠️ In practice, counters should be implemented using [`useSyncedMap`](api/properties/widget-usesyncedmap.md) for correctness.

Basic counter

```
const { widget } = figma  
const { Text, useSyncedState } = widget  
  
function BasicCounter() {  
  const [count, setCount] = useSyncedState("count", 0)  
  
  return (  
    <Text onClick={() => setCount(count + 1)}>  
      {String(count)}  
    </Text>  
  )  
}  
  
figma.widget.register(BasicCounter)
```

The following table describes a series of actions and the resulting widget state, widget display, and each user’s undo/redo stack. To keep things simple, we will just look at undo, but redo works exactly the same way.

| Action | Widget State | User A undo stack | Display |
| --- | --- | --- | --- |
| Initial | `{ count: 0 }` | `[]` | 0 |
| User A increments | `{ count: 1 }` | `[{count: 0}]` | 1 |
| User A increments | `{ count: 2 }` | `[{count: 1}, {count: 0}]` | 2 |
| User A undoes | `{ count: 1 }` | `[{count: 0}]` | 1 |
| User A undoes | `{ count: 0 }` | `[]` | 0 |

caution

⚠️ These actions and results are straightforward and consistent with expectations. **However, when we add another user this BasicCounter will no longer work as expected.**

### A basic counter with 2 users[​](#a-basic-counter-with-2-users "Direct link to A basic counter with 2 users")

Let’s see what happens when two users interact with the widget.

| Action | Widget State | User A undo stack | User B undo stack | Display |
| --- | --- | --- | --- | --- |
| Initial | `{ count: 0 }` | `[]` | `[]` | 0 |
| User A increments | `{ count: 1 }` | `[{count: 0}]` | `[]` | 1 |
| User B increments | `{ count: 2 }` | `[{count: 0}]` | `[{count: 1}]` | 2 |
| User A undoes | `{ count: 0 }` | `[]` | `[{count: 1}]` | 0 |
| User B undoes | `{ count: 1 }` | `[]` | `[]` | 1 |

**When User A performs an "undo" action, the count goes from 2 → 0, which is problematic.** This happens because when User A incremented the counter (from 0 to 1), the inverse of their action sets the counter to 0. To the observer, though, it looks like User A has somehow undone User B’s action. Similarly, when User B undoes, the count gets reset back to 1.

### Counter with `useSyncedMap`[​](#counter-with-usesyncedmap "Direct link to counter-with-usesyncedmap")

The expected behavior for when each user performs an undo action is for the counter to only remove their vote. We can achieve this by tracking of each user’s individual counts separately in a `SyncedMap` and displaying the sum of all counts.

Here is the same widget re-implemented:

Good counter

```
const { widget } = figma  
const { Text, useSyncedMap } = widget  
  
function GoodCounter() {  
  const countMap = useSyncedMap("countMap")  
  
  let totalCount = 0  
  for (let val of countMap.values()){  
    totalCount += val  
  }  
  
  return (  
    <Text  
      onClick={() => {  
        const sessionId = figma.currentUser.sessionId.toString()  
        const val = countMap.get(sessionId) || 0  
        countMap.set(sessionId, val + 1)  
      }}  
    >  
      {String(totalCount)}  
    </Text>  
  )  
}  
  
figma.widget.register(GoodCounter)
```

| Action | Widget State | User A undo | User B undo | Display |
| --- | --- | --- | --- | --- |
| Initial | `{ }` | `[]` | `[]` | 0 |
| User A increments | `{countMap-A: 1}` | `[{countMap-A: null}]` | `[]` | 1 |
| User B increments | `{countMap-A: 1, count-B: 1}` | `[{countMap-A: null}]` | `[{countMap-B: null}]` | 2 |
| User A undoes | `{countMap-B: 1}` | `[]` | `[{countMap-B: null}]` | 1 |
| User B undoes | `{ }` | `[]` | `[]` | 0 |

info

*Note that* **`{count-A: null}`** *simply means this value was just added and that we should remove that key if this is applied to the synced state in an undo.*

Here, we can see that each user's undo interacts well with the existing count. Both users simply "undo" their respective increments when they undo.

## When to [`useSyncedMap`](api/properties/widget-usesyncedmap.md) vs [`useSyncedState`](api/properties/widget-usesyncedstate.md)[​](#when-to-usesyncedmap-vs-usesyncedstate "Direct link to when-to-usesyncedmap-vs-usesyncedstate")

When you want to preserve user specific objects/values, it is important to [`useSyncedMap`](api/properties/widget-usesyncedmap.md), so that values from multiple users get applied properly in multiplayer scenarios. For more information, read [Widget State and Multiplayer.](widget-state-and-multiplayer.md)

Of course, there are times that [`useSyncedState`](api/properties/widget-usesyncedstate.md) is appropriate. For example, let’s say you are storing the “theme” of your widget in a synced state. If User A changes this value from “gray” to “red”, then User B changes the value from “red” to “blue”. When User A undoes, the value will go back to “gray”.

## Undoing Plugin API methods in a Widget[​](#undoing-plugin-api-methods-in-a-widget "Direct link to Undoing Plugin API methods in a Widget")

Let’s say your widget also utilizes the plugin API to perform other actions. To register a set of actions as part of the undo/redo stack, you can use [`figma.commitUndo()`](../plugins/api/properties/figma-commitundo.md).

[Previous

Adding Hover States](adding-hover-states.md)[Next

Best Practices](best-practices.md)

- [How this works](#how-this-works)
- [Counter Widget Example](#counter-widget-example)
  - [A basic counter with 1 user](#a-basic-counter-with-1-user)
  - [A basic counter with 2 users](#a-basic-counter-with-2-users)
  - [Counter with `useSyncedMap`](#counter-with-usesyncedmap)
- [When to `useSyncedMap` vs `useSyncedState`](#when-to-usesyncedmap-vs-usesyncedstate)
- [Undoing Plugin API methods in a Widget](#undoing-plugin-api-methods-in-a-widget)
