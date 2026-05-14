<!-- source: https://developers.figma.com/docs/plugins/api/properties/Variable-hiddenfrompublishing -->

- Plugins
- [Data Types](../data-types.md)
- Variables
- [Variable](../Variable.md)
- hiddenFromPublishing

On this page

Whether this variable is hidden when publishing the current file as a library. Can only true if [`remote`](../Variable.md#remote) is false (e.g. this is a local variable).

## Signature[​](#signature "Direct link to Signature")

### [hiddenFromPublishing](Variable-hiddenfrompublishing.md): boolean

## Remarks[​](#remarks "Direct link to Remarks")

If the parent [`VariableCollection`](../VariableCollection.md) is marked as `hiddenFromPublishing`, then this variable will also be hidden from publishing via the UI.
`hiddenFromPublishing` is independently toggled for a variable and collection, however both must be true for a given variable to be publishable.

[Previous

Variable](../Variable.md)[Next

resolveForConsumer](Variable-resolveforconsumer.md)

- [Signature](#signature)
- [Remarks](#remarks)
