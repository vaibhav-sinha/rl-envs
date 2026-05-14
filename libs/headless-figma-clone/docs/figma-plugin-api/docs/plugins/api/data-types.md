<!-- source: https://developers.figma.com/docs/plugins/api/data-types -->

- Plugins
- Data Types

To assist you with writing your plugin code, we provide a TypeScript typings file for the entire Plugin API.

The typings file is a collection of type and interface declarations you can use for type checking. These declarations represent groups of related properties, parameters, and other data sets you’ll interact with.

You’ll see **types** and **interfaces** in a few places:

- To get and set properties on nodes or global objects
- Passed as parameters in a function
- Returned by a method

Types and interfaces come in varying levels of complexity.

- Choose one option from a list of values, like [`BlendMode`](BlendMode.md).
- Support a mixture of required and optional properties. You’ll see a “?” at the end of any optional properties.
- Offer different properties based on the outcome you want to achieve, like [`ConnectorEndpoint`](ConnectorEndpoint.md).
- Support or reference other types and interfaces, like [`Paint`](Paint.md) and [`Effect`](Effect.md).

[Previous

y](properties/nodes-y.md)[Next

Action](Action.md)
