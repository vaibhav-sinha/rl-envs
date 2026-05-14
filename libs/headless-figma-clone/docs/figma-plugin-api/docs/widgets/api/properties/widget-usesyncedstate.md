<!-- source: https://developers.figma.com/docs/widgets/api/properties/widget-usesyncedstate -->

- Widgets
- Global Objects
- [figma.widget](../figma-widget.md)
- useSyncedState

On this page

The `useSyncedState` hook lets you declare that your widget relies on some state. You give `useSyncedState` a storage key and a default value and it returns the current value stored and a function to update the value.

## Signature[​](#signature "Direct link to Signature")

### [useSyncedState](widget-usesyncedstate.md)<T>(name: string, defaultValue: T | (() => T)): [T, (newValue: T | ((currValue: T) => T)) => void]

## Parameters[​](#parameters "Direct link to Parameters")

### 

| Parameter | Description |
| --- | --- |
| `name` | A storage "key" to store this syncedState. It is important that this is unique across multiple `useSyncedState` calls in a single widget. |
| `defaultValue` | The default value to return if no existing value is found. Values have to be JSON serializable. You can also pass a function that returns a defaultValue, this is useful if `defaultValue` is expensive to compute or if it is a plugin api method that isn't allowed during widget rendering. |

## Remarks[​](#remarks "Direct link to Remarks")

info

If you're familiar with React, `useSyncedState` is very similar to `React.useState`. The main difference being that we require you to explicitly "key" your state values to explicitly manage the namespace of your widget state. This is important for widgets because syncedState lives across different clients who might be running different versions of your widget.

Whenever a state value is updated, the corresponding widget is re-rendered to reflect the latest "state" of the widget.

Updating state values is not allowed when rendering the widget. See [State Updating Code](../../how-widgets-run.md#state-updating-code) for more information.

### Usage Example[​](#usage-example "Direct link to Usage Example")

useSyncedState example

```
const { widget } = figma  
const { Text, useSyncedState } = widget  
  
function SyncedStateExample() {  
  const [count, setCount] = useSyncedState("count", 0)  
  return (  
    <Text  
      onClick={() => {  
        // Update the count  
        setCount(count + 1)  
      }}  
    >  
      The count is: {count}  
    </Text>  
  )  
}  
  
widget.register(SyncedStateExample)
```

### Lazy initial state[​](#lazy-initial-state "Direct link to Lazy initial state")

This is useful if your initial state is expensive or is a plugin api method that isn't allowed during widget rendering (eg. figma.activeUsers). Instead of specifying a value directly, you can specify a function that will only be called if a value doesn’t already exist.

Lazy initial state

```
function Widget() {  
  const [expensiveState, setExpensiveState] = useSyncedState("expensiveState", () => {  
    return expensiveStateComputation()  
  })  
  
  const [activeUsers, setActiveUsers] = useSyncedState("activeUsers", () => figma.activeUsers)  
  ...  
}
```

### Functional updates[​](#functional-updates "Direct link to Functional updates")

This is useful if your new state is computed using the previous state. Instead of setting the state directly with a value, you can pass a function that will be called with the current state value and set to the return value of the function.

Functional updates

```
function Widget() {  
  const [count, setCount] = useSyncedState("count", 0)  
  return (  
    <Text onClick={() => setCount(prevCount => prevCount + 1)}>  
     {count}  
    </Text>  
  )  
}
```

Besides `useSyncedState`, another way to store data on a widget is `useSyncedMap`. These have different characteristics and use cases. See [Widget State & Multiplayer](../../widget-state-and-multiplayer.md) for more information on when you should use one over the other.

[Previous

register](widget-register.md)[Next

useSyncedMap](widget-usesyncedmap.md)

- [Signature](#signature)
- [Parameters](#parameters)
- [Remarks](#remarks)
  - [Usage Example](#usage-example)
  - [Lazy initial state](#lazy-initial-state)
  - [Functional updates](#functional-updates)
