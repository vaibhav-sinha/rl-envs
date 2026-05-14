<!-- source: https://developers.figma.com/docs/plugins/api/global-objects -->

- Plugins
- Global Objects

You can access most of the Plugin API through the [`figma`](figma.md) global object. You'll find properties and functions that allow you to view, create, and update the contents of files.

- View and update file-level properties, like thumbnails, undo history, and version history
- Create, copy, or combine layers
- Adjust properties of existing layers
- Create, use, and manage local styles
- Access users in the file
- Import styles and component from external libraries

Example:

```
figma.createRectangle()  
figma.closePlugin()
```

tip

Tip: The [`figma`](figma.md) global object is available in every Figma window. This means you can open the developer console in any file and access the API. This is a great way to explore the functionality of the API without having to create a plugin. You can also use this approach to test and debug your plugin code.

There are several other global objects available. You can access these from methods on the `figma` global object:

- [`figma.ui`](figma-ui.md) to create a custom interface for your plugin
- [`figma.codegen`](figma-codegen.md) to implement code generation in Dev Mode
- [`figma.timer`](figma-timer.md) to control the timer object in FigJam files
- [`figma.viewport`](figma-viewport.md) to control the viewport: the area of the canvas that's visible on screen
- [`figma.clientStorage`](figma-clientStorage.md) to store data on a user's local machine
- [`figma.parameters`](figma-parameters.md) to accept parameters as input
- [`figma.variables`](figma-variables.md) to interact with variables
- [`figma.teamLibrary`](figma-teamlibrary.md) to interact with assets in a team library
- [`figma.textreview`](figma-textreview.md) to interact with features only available to text review plugins

There are also global variables available across the Plugin API:

### **html**

If you assigned a file name to the [`"ui"`](../manifest.md#ui) field in your `manifest.json` file, you can use this variable to access the file's contents.

Instead of including HTML within a JavaScript string, you can call `figma.showUI(__html__)` . As the HTML is in a separate file, your text editor will render the HTML with syntax highlighting.

### **uiFiles**

If you assigned a map to the [`"ui"`](../manifest.md#ui) field in your `manifest.json` file:

```
"ui": {  
  "main": "main.html",  
  "secondary": "secondary.html"  
}
```

you can use this variable to access each file's contents. You can then call `figma.showUI(__uiFiles__.main)`.

### [fetch](properties/global-fetch.md)(url: string, init?: [FetchOptions](properties/global-fetch.md#fetch-options)): Promise<[FetchResponse](properties/global-fetch.md#fetch-response)>

Fetch a resource from the network, and return a promise with the response.

[View more →](properties/global-fetch.md)

---

[Previous

API Errors](api-errors.md)[Next

figma](figma.md)
