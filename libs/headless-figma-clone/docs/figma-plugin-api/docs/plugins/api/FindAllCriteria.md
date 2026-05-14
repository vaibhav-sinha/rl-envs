<!-- source: https://developers.figma.com/docs/plugins/api/FindAllCriteria -->

- Plugins
- [Data Types](data-types.md)
- FindAllCriteria

The `FindAllCriteria` defines an object that specifies the search criteria for the [`node.findAllWithCriteria`](properties/nodes-findallwithcriteria.md) method.

info

At least one of the following search criterias must be specified. If multiple are specified, only nodes that satisfy all criterias will be returned.

For more examples, see the documentation for [`node.findAllWithCriteria`](properties/nodes-findallwithcriteria.md#example-usages).

### types?: T

If specified, the search will match nodes that have one of the given types.

```
// Find children of type text or frame.  
node.findAllWithCriteria({ types: ["TEXT", "FRAME"] })
```

---

### pluginData?: { keys: string[] }

If specified, the search will match nodes that have [`PluginData`](node-properties.md#getplugindata) stored for your plugin.

```
// Find children that have plugin data stored.  
node.findAllWithCriteria({ pluginData: {} })  
  
// Find children that have plugin data stored with keys  
// "a" or "b"  
node.findAllWithCriteria({  
  pluginData: {  
    keys: ["a", "b"]  
  }  
})
```

---

### sharedPluginData?: { namespace: string; keys: string[] }

If specified, the search will match nodes that have [`SharedPluginData`](node-properties.md#getsharedplugindata) stored on the given `namespace` and `keys`.

```
// Find children that have shared plugin data  
// on the "foo" namespace.  
node.findAllWithCriteria({  
  sharedPluginData: {  
    namespace: "foo"  
  }  
})  
  
// Find children that have shared plugin data  
// on the "foo" namespace with keys "a" or "b"  
node.findAllWithCriteria({  
  sharedPluginData: {  
    namespace: "foo",  
    keys: ["a", "b"]  
  }  
})
```

---

[Previous

ExportSettings](ExportSettings.md)[Next

FontName](FontName.md)
