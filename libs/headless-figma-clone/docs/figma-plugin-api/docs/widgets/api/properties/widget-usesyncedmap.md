<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-usesyncedmap -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- useSyncedMap

On this page

The `useSyncedMap` hook works similarly to `useSyncedState`, but each value within the map is updated last-writer-wins, instead of the entire map being overwritten last-writer-wins.

## Signature[​](#signature "Direct link to Signature")

### [useSyncedMap](widget-usesyncedmap.md)<T>(name: string): [SyncedMap](../type-SyncedMap.md#synced-map)<T>

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `name` | A storage name assigned to this syncedMap. If your widgets uses multiple synced maps, it is important that this is unique across the multiple `useSyncedMap calls. |

## Remarks[​](#remarks "Direct link to Remarks")

The main use case of `useSyncedMap` is to support multiple clients updating widget data concurrently. When this happens, the synced map will merge the changes in the order they are received by the server, adding / updating / removing keys. In comparison, a similar value in `useSyncedState` will be clobbered by the last client.

The return value of `useSyncedMap` is a `Map` like JavaScript object that implements methods like `get`, `set`, `delete`, `keys()` etc.

info

Besides `useSyncedMap`, another way to store data on a widget is `useSyncedState`. These have different characteristics and use cases. See [Widget State & Multiplayer](../../widget-state-and-multiplayer.md) for more information on when you should use one over the other.

### Usage Example[​](#usage-example "Direct link to Usage Example")

useSyncedMap example

```
const { widget } = figma  
const { useSyncedMap, Rectangle } = widget  
  
function SyncedMapExample() {  
  const voteMap = useSyncedMap<number>("sessionIdToVotes")  
  
  return (  
    <Rectangle  
      onClick={() => {  
        const sessionId = figma.activeUsers[0].sessionId  
        if (!voteMap.get(sessionId)) {  
          voteMap.set(sessionId, 1)  
        }  
      }}  
    />  
  )  
}  
  
widget.register(SyncedMapExample)
```

[Previous

useSyncedState](widget-usesyncedstate.md)[Next

usePropertyMenu](widget-usepropertymenu.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
  - [Usage Example](#usage-example)
