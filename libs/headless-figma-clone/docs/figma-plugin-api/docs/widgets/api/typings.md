<!-- source: https://developers.figma.com/docs/widgets/api/typings -->

- Widgets
- Overview
- The Typings File

Here’s a sample tsconfig.json to get you started. Widgets created from the default templates will already have this included:

```
{  
   "compilerOptions": {  
      "jsx": "react",  
      "jsxFactory": "figma.widget.h",  
      "jsxFragmentFactory": "figma.widget.Fragment",  
      "target": "es6",  
      "strict": true,  
      "typeRoots": [  
         "./node_modules/@types",  
         "./node_modules/@figma"  
      ]  
   }  
}
```

You’ll also need to install widget and plugins typings from npm

```
npm install --save-dev @figma/widget-typings @figma/plugin-typings
```

[Previous

Widget Manifest](../widget-manifest.md)[Next

figma.widget](figma-widget.md)
