<!-- source: https://developers.figma.com/docs/widgets/stability-and-updates -->

- Widgets
- Other
- Stability and Updates

On this page

This section is about:

- How new API updates are released.
- How the Figma team provides stability to **published** widgets.

Even though the widget API might change and is currently in active development, it is important that inserted published widgets don't break all the time. Once a widget is published and subsequently inserted, we make sure to respect its `manifest.widgetApi` version to ensure backwards compatibility with subsequent API updates.

On the other hand, we also want to strike the right balance between providing new functionality quickly and there are times when breaking changes might be unavoidable. Below is how we intend to do that.

## API Versioning and changes[​](#api-versioning-and-changes "Direct link to API Versioning and changes")

Changes to the widget API are identified as "Version X, Update Y". The first number "X" represents the major version number, and the second number "Y" represents minor updates.

info

Additionally because widgets also use the Plugin API heavily, widgets also have to contend with the plugin api version. See also [stability](../plugins/stability-updates.md) in the Plugin API documentation.

Whenever we release a breaking widget API version, we'll update corresponding `manifest.widgetApi` value and the latest publish types on npm accordingly.

## Updating your widget safely[​](#updating-your-widget-safely "Direct link to Updating your widget safely")

Whenever you update your widget, it's important to keep in mind any existing widgets that are already in FigJam files.

info

For stability, existing widgets in files will continue to run the same version of the widget, while newly inserted widgets will always run the latest version of the widget.

We're actively working on a way to safely update existing widgets to their latest version, so it's important to keep these guidelines in mind to ensure widgets can be safely updated in the future.

Here are some helpful guidelines to help ensure that your widgets are stable across published releases:

**Never rename names for `useSyncedState` & `useSyncedMap`**

Here's an example of a destructive change that should be avoided:

Destructive synced state change

```
// Before  
const [count, setCount] = useSyncedState("count", 0)  
  
// After (WARNING: This is an example of what NOT to do)  
const [count, setCount] = useSyncedState("widgetCount", 0)
```

With this change, any existing with with widget state stored at `"count"` will no longer read from `"count"`, which will effectively "reset" already inserted widgets. Users who were previously interacting with your widget will lose their data because existing widgets will have their counts reset after the update.

**Make sure that code changes are backwards compatible**

It is very important that the shape/type of values stored in your widget state is backwards compatible.

Here is an example of a dangerous code change to make across versions:

Dangerous change to default synced state

```
// Before  
const [config, setConfig] = useSyncedState("config", {  
  size: "large",  
  color: "red"  
})  
  
// After (WARNING: This is an example of what NOT to do)  
const [config, setConfig] = useSyncedState("config", {  
  size: "large",  
  color: "red",  
  shape: "circle" // <--- Added this key to the default value.  
})
```

Just by looking at the code in "after", you might think at that `config.shape` will always exist! However, this is not true because existing widgets will have `config` already set to an old value and will not have the `"shape"` key. The default value passed to `useSyncedState` is all-or-nothing - it is only used as the value if a value doesn't already exist!

[Previous

Testing](testing.md)[Next

Samples](/docs/widgets/samples/)

- [API Versioning and changes](#api-versioning-and-changes)
- [Updating your widget safely](#updating-your-widget-safely)
