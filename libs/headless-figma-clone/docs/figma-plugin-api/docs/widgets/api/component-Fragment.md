<!-- source: https://developers.figma.com/docs/widgets/api/component-Fragment -->

- Widgets
- Component Types
- Fragment

The Fragment component does not take any props outside of `children` and an optional `key` prop. This component simply renders its `children` and behaves similarly to [Fragments in React](https://reactjs.org/docs/fragments.html).

> **This component cannot be used as the root component of a widget.**

To set this up, make sure you have the following lines added to your tsconfig.json

tsconfig.json

```
{  
  "compilerOptions": {  
    "jsxFactory": "figma.widget.h",  
  
    // Add this line  
    "jsxFragmentFactory": "figma.widget.Fragment",  
  
    ...  
  }  
}
```

When writing JSX, you can now use the following syntax:

Fragment with empty tags

```
const { widget } = figma  
const { Text } = widget  
  
function NameList({ names }: { names: string[] }) {  
  return (  
    <>  
      {names.map(name => <Text key={name}>{name}</Text>)}  
    </>  
  )  
}
```

Alternatively, if you can also reference the **Fragment** component directly if you need to:

Fragment component

```
const { widget } = figma  
const { Text, Fragment } = widget  
  
function NameList({ names }: { names: string[] }) {  
  return (  
    <Fragment>  
      {names.map(name => <Text key={name}>{name}</Text>)}  
    </Fragment>  
  )  
}
```

This is useful if you need to specify the key prop when [working with lists](../working-with-lists.md).

[Previous

Line](component-Line.md)[Next

AlignItems](type-AlignItems.md)
