<!-- source: https://developers.figma.com/docs/plugins/setting-editor-type -->

- Plugins
- Getting Started
- Setting editor type

The [editorType](manifest.md#editortype) field is a required field in plugin manifests. Use it to specify which editor your plugin works in. You can create plugins for a specific editor type (i.e. one of Figma's editor products), a combination of editor types, or build plugins that perform different actions in each editor. You can use any of the below combinations of editor types:

Specifying supported editor types in manifest.json

```
// A plugin that works in Figma design and FigJam  
"editorType": [  
  "figjam",  
  "figma"  
]  
  
// A plugin that works in Figma design and Dev Mode  
"editorType": [  
  "figma",  
  "dev"  
]  
  
// A plugin that only works in Figma design  
"editorType": [  
  "figma"  
]  
  
// A plugin that only works in FigJam  
"editorType": [  
  "figjam"  
]  
  
// A plugin that only works in Dev Mode  
"editorType": [  
  "dev"  
]  
  
// A plugin that only works in Figma Slides  
"editorType": [  
  "slides"  
]  
  
// A plugin that only works in Figma Buzz  
"editorType": [  
  "buzz"  
]
```

caution

Plugins cannot specify both `"dev"` and `"figjam"` editor types at the same time.

Keep in mind, when you specify multiple editor types, your plugin won't have access to certain functions and events depending on the editor the plugin runs in. For example, if you use `figma.createSticky()`, the code will work while the plugin is running in FigJam, but not when you run it in Figma.

Learn more about which APIs are accessible in each editor:

- [Working with FigJam](working-in-figjam.md)
- [Working in Dev Mode](working-in-dev-mode.md)
- [Working in Slides](working-in-slides.md)
- [Working in Buzz](working-in-buzz.md)

If you want to set conditional logic in your plugin to assign behavior based on the editor the plugin is running in, you can use the method [`figma.editorType`](api/figma.md#editortype). This will return a string value of `figma`, `figjam`, `dev`, `slides`, or `buzz`.

Using figma.editorType to check where the plugin is being run

```
if (figma.editorType === 'figjam') {  
  // In FigJam  
}  
  
if (figma.editorType === 'figma') {  
  // In Figma design mode  
}  
  
if (figma.editorType === 'dev') {  
  // In Figma's Dev Mode  
}  
  
if (figma.editorType === 'slides') {  
  // In Figma Slides  
}  
  
if (figma.editorType === 'buzz') {  
  // In Figma Buzz  
}
```

[Previous

Plugin Quickstart Guide](plugin-quickstart-guide.md)[Next

How Plugins Run](how-plugins-run.md)
