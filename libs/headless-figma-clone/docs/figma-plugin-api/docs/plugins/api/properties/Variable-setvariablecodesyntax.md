<!-- source: https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax -->

- Plugins
- [Data Types](../data-types.md)
- Variables
- [Variable](../Variable.md)
- setVariableCodeSyntax

On this page

Add or modify a platform definition on [`codeSyntax`](../Variable.md#codesyntax). Acceptable platforms are `'WEB'`, `'ANDROID'`, and `'iOS'`.

## Signature[​](#signature "Direct link to Signature")

### [setVariableCodeSyntax](Variable-setvariablecodesyntax.md)(platform: [CodeSyntaxPlatform](../CodeSyntaxPlatform.md#code-syntax-platform), value: string): void

## Remarks[​](#remarks "Direct link to Remarks")

Here’s an example of adding code syntax definitions to a variable:

```
 const collection = figma.variables.createVariableCollection(  
   'Example Collection'  
 )  
 const variable = figma.variables.createVariable(  
   'ExampleVariableName',  
   collection,  
   'STRING'  
 )  
 variable.setVariableCodeSyntax('WEB', 'example-variable-name')  
 variable.setVariableCodeSyntax('ANDROID', 'exampleVariableName')  
 variable.setVariableCodeSyntax('iOS', 'exampleVariableName')  
  
 // Output:  
 // {  
 //   WEB: 'example-variable-name',  
 //   ANDROID: 'exampleVariableName',  
 //   iOS: 'exampleVariableName'  
 // }  
  
 console.log(variable.codeSyntax)
```

[Previous

scopes](Variable-scopes.md)[Next

VariableCollection](../VariableCollection.md)

- [Signature](#signature)
- [Remarks](#remarks)
