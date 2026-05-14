<!-- source: https://developers.figma.com/docs/widgets/widget-state -->

- Widgets
- Basics of Widgets
- Widget State

Every instance of a widget has its own state. You can think of a widget’s state as its data representation. A widget with the same state should always render the same output. **If you want to change how a widget looks in response to a user interaction, you should update its state!**

Here’s an example of a widget that increments a count for every click:

Increment count with synced state

```
const { widget } = figma  
const { Text, useSyncedState } = widget  
  
function SimpleCounter() {  
  const [count, setCount] = useSyncedState("count", 0)  
  return (  
    <Text  
      onClick={() => {  
        setCount(count + 1)  
      }}  
    >  
      {count}  
    </Text>  
  )  
}  
  
widget.register(SimpleCounter)
```

info

We interchangeably refer to a widget's state as synced state because all of a widget's state is currently synced across all clients. In the future, we intend to support things like local state but for now all state is synced state.

We use the `useSyncedState` hook above to declare a data value on the widget that defaults to `0`. Under-the-hood, you can think of this widget's state as a JSON object that looks like this:

caution

If you have multiple `useSyncedState` calls, make sure you give them unique keys!

```
// initially  
{  
  "count": 0  
}  
  
// click once  
{  
  "count": 1  
}  
  
// click again  
{  
  "count": 2  
}
```

Each time this object gets updated, the associated widget is re-rendered to reflect the changes. Any JSON serializable value is a valid state value.

[Previous

How Widgets Run](how-widgets-run.md)[Next

Prototyping Widget UI](prototyping-widget-ui.md)
