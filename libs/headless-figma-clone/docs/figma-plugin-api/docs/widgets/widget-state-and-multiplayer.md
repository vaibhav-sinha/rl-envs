<!-- source: https://developers.figma.com/docs/widgets/widget-state-and-multiplayer -->

- Widgets
- Development Guides
- Widget State & Multiplayer

On this page

Widgets live on the canvas and can be highly interactive. In certain cases, multiple users might even click on the same widget at the same time! It is crucial to design your widget's state with multiplayer scenarios in mind.

## When to use `useSyncedState` vs. `useSyncedMap`[​](#when-to-use-usesyncedstate-vs-usesyncedmap "Direct link to when-to-use-usesyncedstate-vs-usesyncedmap")

In the counter example [here](widget-state.md), if 2 users click on the counter at the same time, both users will set `count` to `count + 1`. This is undesirable because it means that only one vote gets registered! The desired behavior here is for `count` to become `count + 2` instead.

We can achieve this by using `useSyncedMap` to store a map of `sessionId` to votes - under the hood, the synced map will merge keys that have been created / removed / updated across different clients. Beyond the top level keys of the synced map, the semantics of each value stored in it is exactly the same as a single synced state value.

![](https://static.figma.com/uploads/d1e87cf73363874a8bd35ecdd9aa7725d463ea0b)

Here’s a quick summary of when to use `useSyncedState` vs `useSyncedMap`:

| `useSyncedState` | `useSyncedMap` |
| --- | --- |
| Great for storing simple values that should always override the last value | Great if you want to merge “edits” from multiple clients that might override each other otherwise  Use cases: Polls, Counters, Tables |
| In a Poll widget, `useSyncedState` can be used to implement the show / hide results toggle | In the same Poll widget, tracking votes in the poll should use `useSyncedMap` instead to ensure that clients don’t override each other’s votes. |

## When to use one vs. many `useSyncedState`[​](#when-to-use-one-vs-many-usesyncedstate "Direct link to when-to-use-one-vs-many-usesyncedstate")

The flexibility of `useSyncedState` means that you might end up storing complex JSON structures in a single `useSyncedState` call OR you might decide to break this up into multiple `useSyncedState` calls.

One vs many useSyncedState

```
// one  
useSyncedState("settings", {  
  "color": "blue",  
  "size": "large",  
})  
  
// many  
useSyncedState("color", "blue")  
useSyncedState("size", "large")
```

Choosing between these two options ultimately depends on how you want the values to be merged over multiplayer.

If you have one big synced state, each value that gets set on this synced state clobbers the last value.

Setting one big synced state

```
setState({  
  color: "red", // <- client A sets this  
  size: "large"  
})  
  
setState({  
  color: "blue",  
  size: "medium" // <- client b sets this  
})  
  
  
// only one of those changes will end up taking effect.  
// the second setState call will effectively override the first one.
```

If instead you had 2 useSyncedState calls here, the final state will be merged because each useSyncedState is "applied" separately!

Setting multiple synced state

```
// yielding  
color="red", size="medium"
```

Of course, this isn't always a good thing! In certain cases, you might want to validate that only certain combinations are allowed! This would be a good use case to combine state values into a single `useSyncedState` hook.

[Previous

Setting Editor Type](setting-editor-type.md)[Next

Handling User Events](handling-user-events.md)

- [When to use `useSyncedState` vs. `useSyncedMap`](#when-to-use-usesyncedstate-vs-usesyncedmap)
- [When to use one vs. many `useSyncedState`](#when-to-use-one-vs-many-usesyncedstate)
