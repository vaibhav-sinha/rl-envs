<!-- source: https://developers.figma.com/docs/widgets/managing-multiple-widgets -->

- Widgets
- Development Guides
- Managing Multiple Widgets

On this page

So far, we’ve only been talking about single, standalone widgets. For certain use cases, you might want to coordinate across instances of your widget within the same file! We've augmented the [Plugin API](../plugins.md) to complement the Widget API seamlessly to with these use cases in mind.

## `WidgetNode.widgetId` and `figma.widgetId`[​](#widgetnodewidgetid-and-figmawidgetid "Direct link to widgetnodewidgetid-and-figmawidgetid")

Every WidgetNode is associated with its corresponding `manifest.json` "id" field and you can use the Plugin API to read this value to check if a given widget node belongs to your widget.

WidgetNode.widgetId and figma.widgetId

```
const allWidgetNodes: WidgetNode[] = figma.currentPage.findAll(node => {  
  return node.type === "WIDGET"  
})  
  
const myWidgetNodes: WidgetNode[] = allWidgetNodes.filter(node => {  
  return node.widgetId === figma.widgetId  
})
```

## `findWidgetNodesByWidgetId`[​](#findwidgetnodesbywidgetid "Direct link to findwidgetnodesbywidgetid")

If you want to find all of the widget nodes that match the same `node.widgetId`, you can use [findWidgetNodesByWidgetId](../plugins/api/properties/nodes-findwidgetnodesbywidgetid.md).

```
 findWidgetNodesByWidgetId(widgetId: string): Array<WidgetNode>
```

## WidgetNode.widgetSyncedState[​](#widgetnodewidgetsyncedstate "Direct link to WidgetNode.widgetSyncedState")

Using the Plugin API, you can read the syncedState of a given widget node via [WidgetNode.widgetSyncedState](../plugins/api/WidgetNode.md#widgetsyncedstate).

info

Similar to [pluginData](../plugins/api/DocumentNode.md#getplugindata), access to this data is widget specific! The synced state on each widget node will only be visible to widgets that have the same `WidgetNode.widgetId`.

You can then implement a voting widget that caps the maximum number of votes each user can make within in the file. Prior to registering a user’s vote, you can sum up the total number of votes the particular user has made by enumerating through all your widgets in the current file.

Here’s an example snippet of code that does this:

WidgetNode.widgetSyncedState

```
const { widget } = figma  
const { Text, useSyncedMap } = widget  
  
const MAX_VOTES_ALLOWED = 5  
  
function CounterWidget() {  
  const votes = useSyncedMap<number>("votes")  
  
  return (  
    <Text  
      onClick={() => {  
        let numVotes = 0  
        figma.currentPage.children.forEach(node => {  
          if (node.type === "WIDGET" && node.widgetId === figma.widgetId) {  
            numVotes += node.widgetSyncedState[figma.currentUser.id]  
          }  
        })  
  
        if (numVotes >= MAX_VOTES_ALLOWED) {  
          figma.notify(`You've already voted ${MAX_VOTES_ALLOWED} times.`)  
        } else {  
          votes.set(figma.currentUser.id, 1)  
        }  
      }}  
    >  
      {votes.size()}  
    </Text>  
  )  
}  
  
widget.register(CounterWidget)
```

## WidgetNode.cloneWidget[​](#widgetnodeclonewidget "Direct link to WidgetNode.cloneWidget")

Additionally, given a widget node, you can clone it with a custom synced state and synced map values using [WidgetNode.cloneWidget](../plugins/api/WidgetNode.md#clonewidget).

WidgetNode.cloneWidget

```
interface WidgetNode {  
  cloneWidget(  
    syncedStateOverrides: { [name: string]: any },  
    syncedMapOverrides?: { [mapName: string]: { [key: string]: any } }  
  ): WidgetNode  
}
```

caution

NOTE: every key in `syncedMapOverrides` will override the entire corresponding synced map, deleting all existing keys in the map. If you wish to preserve some of the keys in the map, you'll need to explicitly specify them in the override.

Similar to `WidgetNode.widgetSyncedState`, the is only supported for widgets that share the same `WidgetNode.widgetId`! Only you can call this function on your widget nodes.

When used in combination with the `useWidgetId` hook, this lets you create rich, multi-widget experiences like an Org Chart, where each Org Chart Item is its own widget.

Similar to [`WidgetNode.clone`](../plugins/api/WidgetNode.md#clone), the duplicate will be parented under `figma.currentPage`. If you are relying on the x, y or the relativeTransform of the original widget, make sure to account for the case where the original widget is parented under a different node (eg. a section).

## WidgetNode.setWidgetSyncedState[​](#widgetnodesetwidgetsyncedstate "Direct link to WidgetNode.setWidgetSyncedState")

Not only can you clone a widget with a new synced state and synced map values, you can also set the state on an existing widget matching the same `node.widgetId` using [setWidgetSyncedState](../plugins/api/WidgetNode.md#setwidgetsyncedstate). This can be helpful managing multi-widget experiences where the user is able to update other widgets by taking an action on a single widget.

```
  interface WidgetNode {  
    setWidgetSyncedState(  
      syncedState: { [name: string]: any },  
      syncedMap?: { [mapName: string]: { [key: string]: any } },  
    ): void  
  }
```

[Previous

Images in Widgets](images-in-widgets.md)[Next

Adding Hover States](adding-hover-states.md)

- [`WidgetNode.widgetId` and `figma.widgetId`](#widgetnodewidgetid-and-figmawidgetid)
- [`findWidgetNodesByWidgetId`](#findwidgetnodesbywidgetid)
- [WidgetNode.widgetSyncedState](#widgetnodewidgetsyncedstate)
- [WidgetNode.cloneWidget](#widgetnodeclonewidget)
- [WidgetNode.setWidgetSyncedState](#widgetnodesetwidgetsyncedstate)
