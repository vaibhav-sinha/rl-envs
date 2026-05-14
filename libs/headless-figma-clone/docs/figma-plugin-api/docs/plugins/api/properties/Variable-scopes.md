<!-- source: https://developers.figma.com/docs/plugins/api/properties/Variable-scopes -->

- Plugins
- [Data Types](../data-types.md)
- Variables
- [Variable](../Variable.md)
- scopes

On this page

An array of scopes in the UI where this variable is shown. Setting this property will show/hide this variable in the variable picker UI for different fields.

## Signature[​](#signature "Direct link to Signature")

### [scopes](Variable-scopes.md): Array<[VariableScope](../VariableScope.md)>

## Remarks[​](#remarks "Direct link to Remarks")

Setting scopes for a variable does not prevent that variable from being bound in other scopes (for example, via the Plugin API). This only limits the variables that are shown in pickers within the Figma UI.

[Previous

resolveForConsumer](Variable-resolveforconsumer.md)[Next

setVariableCodeSyntax](Variable-setvariablecodesyntax.md)

- [Signature](#signature)
- [Remarks](#remarks)
