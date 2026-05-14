<!-- source: https://developers.figma.com/docs/plugins/api/properties/TextStyle-setboundvariable -->

- Plugins
- [Data Types](../data-types.md)
- Variables
- setBoundVariable

On this page

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](../../working-with-variables.md) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

## Signature[​](#signature "Direct link to Signature")

### setBoundVariable(field: [VariableBindableTextField](../VariableBindableTextField.md), variable: [Variable](../Variable.md) | null): void

## Parameters[​](#parameters "Direct link to Parameters")

### field[​](#field "Direct link to field")

The field to bind the variable to.

### variable[​](#variable "Direct link to variable")

The variable to bind to the field. If `null` is provided, the field will be unbound from any variables. Make sure to pass a Variable object or null; passing a variable ID is not supported.

[Previous

VariableValue](../VariableValue.md)[Next

LibraryVariable](../LibraryVariable.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [field](#field)
  - [variable](#variable)
