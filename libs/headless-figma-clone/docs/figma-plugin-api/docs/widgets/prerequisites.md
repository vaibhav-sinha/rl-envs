<!-- source: https://developers.figma.com/docs/widgets/prerequisites -->

- Widgets
- Getting Started
- Prerequisites

On this page

Our Widget API is designed to be written in [JSX](https://reactjs.org/docs/introducing-jsx.html) and [TypeScript](https://www.typescriptlang.org/) and leverage our existing [plugin API](../plugins.md) extensively. Both JSX and TypeScript need to be compiled down into JavaScript prior to being run in the Widget Sandbox (in the browser).

## JSX[​](#jsx "Direct link to JSX")

If you are used to writing HTML, you might find writing JSX familiar. JSX allows us to express the desired widget object using a declarative syntax that looks like the following snippet

code.tsx

```
const { widget } = figma  
const { AutoLayout, Text } = widget  
  
function JSXSample() {  
  return (  
    <AutoLayout>  
      <Text>Hello Widget</Text>  
    </AutoLayout>  
  )  
}  
  
widget.register(JSXSample)
```

Under-the-hood, the `<Text>Hello Widget</Text>` line above gets converted into the following JavaScript code:

code.js

```
figma.widget.h(Text, null, "Hello Widget")
```

`figma.widget.h` comes from how we've configured `tsconfig.json` (if this was React, it would be `React.createElement`).

Additionally, with JSX we can specify attributes on each element (known as `props`). When passed props, the conversion looks something like this:

Passing in props

```
// code.tsx  
<Text fontSize={20}>Hello Widget</Text>  
  
// code.js  
figma.widget.h(Text, { fontSize: 20 }, "Hello Widget")
```

## TypeScript[​](#typescript "Direct link to TypeScript")

TypeScript is an extension of the JavaScript that allows you to add type annotations to your code. These don't change how your code runs, they are just notes for yourself and for the compiler.

When pair with an editor like Visual Studio code, these annotations are able to provide helpful hints during development:

![](https://static.figma.com/uploads/31b8d7cdf04d6ff8d81d05da847920d4139fcaf2)

## Further Reading[​](#further-reading "Direct link to Further Reading")

Here are some more resources you may find helpful to get started:

- [Pre-requisites for working with our our plugin API](../plugins/prerequisites.md)
- [TypeScript with the plugin API](../plugins/typescript.md)
- [TypeScript: Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Primer on JSX](https://reactjs.org/docs/introducing-jsx.html)
- [The Odin Project](https://www.theodinproject.com/courses/web-development-101)
- [Codecademy: Web Development](https://www.codecademy.com/learn/paths/web-development)
- [Khan Academy: Intro to JS](https://www.khanacademy.org/computing/computer-programming/programming)

For more complex widgets, additional tools used in modern web development will be useful. You don't need to learn these tools before starting to write widgets, but they will come in handy eventually. We opted to build on top of the most popular open-source tools in the web development community rather than to roll out our own proprietary solutions. Here are some examples of things you might end up using:

- An integrated development environment (IDE) such as [VS Code](https://code.visualstudio.com/), [Eclipse IDE](https://eclipseide.org/), or [IntelliJ IDEA](https://www.jetbrains.com/idea/): As a developer, IDEs can be a useful way to work across multiple files or sources and often provide extensions that make life easier. JavaScript and HTML are well-supported languages in most IDEs.
- [Asynchronous JavaScript](../plugins/async-tasks.md): Async operations are an important part of Figma widgets, such as for loading pages or requesting and using data that may take a brief time to return.
- Webpack, to [bundle](../plugins/libraries-and-bundling.md) large multi-file projects and import libraries: Bundling helps pack dependencies into the format required for Figma widgets.
- React, Vue, etc. to create complex user interfaces.

[Previous

Introduction](../widgets.md)[Next

Setup Guide](setup-guide.md)

- [JSX](#jsx)
- [TypeScript](#typescript)
- [Further Reading](#further-reading)
