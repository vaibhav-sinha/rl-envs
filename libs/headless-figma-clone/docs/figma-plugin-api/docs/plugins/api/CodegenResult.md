<!-- source: https://developers.figma.com/docs/plugins/api/CodegenResult -->

- Plugins
- [Data Types](data-types.md)
- CodegenResult

```
type CodegenResult = {  
  // The title of the section  
  title: string  
  // The code of the section  
  code: string  
  // The language to use for syntax highlighting  
  language:  
    | 'TYPESCRIPT'  
    | 'CPP'  
    | 'RUBY'  
    | 'CSS'  
    | 'JAVASCRIPT'  
    | 'HTML'  
    | 'JSON'  
    | 'GRAPHQL'  
    | 'PYTHON'  
    | 'GO'  
    | 'SQL'  
    | 'SWIFT'  
    | 'KOTLIN'  
    | 'RUST'  
    | 'BASH'  
    | 'PLAINTEXT'  
}
```

[Previous

CodegenPreferencesEvent](CodegenPreferencesEvent.md)[Next

CodeSyntaxPlatform](CodeSyntaxPlatform.md)
