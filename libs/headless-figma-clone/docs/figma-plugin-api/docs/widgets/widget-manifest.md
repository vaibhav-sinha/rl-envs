<!-- source: https://developers.figma.com/docs/widgets/widget-manifest -->

- Widgets
- Overview
- Widget Manifest

On this page

Each widget must define a `manifest.json` file. If you use the "Create new widget" option, Figma will automatically create a simple manifest for you.

Here’s an example of a widget manifest file:

info

This file is similar to the [plugin manifest](../plugins/manifest.md) with the additional `containsWidget` and `widgetApi` properties and without plugin-specific options like menus or relaunchButtons.

manifest.json

```
{  
  "name": "MyWidget",  
  "id": "737805260747778093",  
  "api": "1.0.0",  
  "widgetApi": "1.0.0",  
  "editorType": ["figma", "figjam"],  
  "containsWidget": true,  
  "main": "code.js",  
  "ui": "ui.html",  
  "documentAccess": "dynamic-page",  
  "networkAccess": {  
    "allowedDomains": ["none"]  
  }  
}
```

### name: string

The name of the widget, as it will appear in the menu.

---

### id?: string

The widget ID to publish updates to. This ID will be assigned to you by Figma and is typically obtained using the "Create new Widget" feature, which will generate a manifest file with a new `id`. You can also get a new widget ID at the time of publishing your widget.

---

### widgetApi: string

The version of the widget API used by the widget. The current widgetApi version is `"1.0.0"`. In the future, when there are more versions of the widget API, this will be used to ensure stability across widget versions. See [Stability and Updates](stability-and-updates.md) for more information about updates to the api.

**We recommend updating to the latest version whenever possible** to get the latest features, bug fixes, and documentation.

---

### containsWidget: true

All widget manifests should have this set to true.

---

### editorType: ('figma' | 'figjam')[]

This allows you to specify the editor that your widget is intended for and will impact which editor your widget appears in.

The types we support currently are:

```
"editorType": ["figma"]  
"editorType": ["figjam"]  
"editorType": ["figma", "figjam"]
```

---

### main: string

The relative file path to the JavaScript code of your widget.

---

### ui?: string | { [key: string]: string }

Used to specify HTML file/files that can be used in the iframe modal via `figma.showUI`, if you choose to have one.

- If a single string is specified, this is the relative file path to the HTML file whose contents will be available as a string in the Javascript code via the constant [`__html__`](../plugins/api/api-reference.md#html).
- If a map is specified, each entry of the map will be available at [`__uiFiles__`](../plugins/api/api-reference.md#uifiles)

---

### documentAccess?: 'dynamic-page'

This field ensures the widget supports dynamic page loading. The field is required for all new widgets and the value must be `dynamic-page`.

- If the manifest field is included, then the widget will run immediatley.
- If the manifest field is not included, then when the widget is run or interacted with for the first time after a user opens a file, the entire file will load and Figma will show a "Loading n pages for widget…" notification, where `n` is the number of pages being loaded.

If your existing widget's manifest doesn't include this field, you should [migrate your widget to use dynamic page loading](../plugins/migrating-to-dynamic-loading.md).

note

This field is required for all new widgets and new versions of widgets.

---

### networkAccess?: NetworkAccess

caution

This property is currently in public beta and is subject to change.

Used to specify the list of domains that your widget is permitted to access. When `networkAccess` is used:

- Your widget can only access the domains that you specify. If your widget attempts to access other domains, the widget is prevented from doing so.

  note

  The enforcement of network access is limited only to requests made by the widget, such as requests to a public API. In a situation such as a widget rendering a website in a frame, network access limits only apply to the website's domain. Network access limits don’t affect the website’s resources.
- The list of domains that your widget can access is displayed on your widget's Community page.

`networkAccess` has the following properties:

- `allowedDomains` is a required list of strings. The strings are match patterns for domains that your widget is permitted to access. If `networkAccess` is used, `allowedDomains` must include at least one pattern. Optionally, patterns can start with one of the permitted schemes: `http`, `https`, `ws`, or `wss`. The `*` character may be used as a wildcard for subdomains, or used to represent all domains.
- `reasoning` is a usually-optional string that describes why your widget needs to access the allowed domains. `reasoning` is required if:
  - Your `allowedDomains` list includes `"*"`
  - Your `allowedDomains` list includes local or development servers. If you only need local or development servers for development, please use `devAllowedDomains` instead.
- `devAllowedDomains` is an optional list of strings. The strings are match patterns for domains that your widget is permitted to access during development. You can use most of the same patterns in `devAllowedDomains` as you can in `allowedDomains`.

Valid patterns for `allowedDomains`:

- `["none"]`: The widget cannot access any external network resources. Note that we preload the Inter font for use in widgets, so you don't need to include an Inter font source in your allowedDomains.

Valid patterns for `allowedDomains` and `devAllowedDomains`:

- `["*"]`: The widget may access any external network resources. If this pattern is included in `allowedDomains`, the `reasoning` property is required.
- `["*.example.com"]`: The `*` character can be used to permit all subdomains of a given domain.
- `["http://example.com", "https://example.com", "ws://example.com", "wss://example.com"]`: `http`, `https`, `ws`, and `wss` are permitted schemes that can be used to prefix domains. Other schemes, such as `file`, cannot be used.
- `["api.example.com/rest/get", "www.example.com/images/", "http://s3.amazonaws.com/example_bucket/"]`: URLs to specific resources can be used.
- `["example.com", "figma.com"]`: Domains can be used without schemes, subdomains, or wildcards.
- `["http://localhost", "https://localhost", "http://localhost:3000", "http://localhost:8081"]`: During development, the widget can access a local/development web server. If the server is running on a port other than port 80, the port number can be provided after the URL. If this pattern is included in `allowedDomains`, the `reasoning` property is required.

note

In the previous example, the trailing slash in `www.example.com/images/` identifies a path to multiple resources. For example, `www.example.com/images/` lets a widget access images at `www.example.com/images/img1.png` and `www.example.com/images/img2.png`.

A pattern with *no* trailing slash blocks any deeper access to files on that path. For example, `api.example.com/rest/get` stops a widget from accessing `api.example.com/rest/get/exampleresource.json`. This can be useful, for example, if your widget uses a REST API endpoint and you want to restrict the widget to that endpoint only.

For example:

```
"networkAccess": {  
  "allowedDomains": [  
    "figma.com",  
    "*.google.com",  
    "https://my-app.cdn.com",  
    "wss://socket.io",  
    "example.com/api/",  
    "exact-path.com/content"  
  ],  
  "devAllowedDomains": [  
    "http://localhost:3000"  
  ]  
}
```

More formally,

```
interface NetworkAccess {  
  allowedDomains: string[]  
  reasoning?: string  
  devAllowedDomains: string[]  
}
```

---

### build?: string

**Experimental!** A shell command to run before we load the file specified in `main` and `ui`. This can be used to call build commands such as compiling with Typescript, running Webpack, etc. The command is run in the directory of the manifest.

---

## Plugin API Specific Options[​](#plugin-api-specific-options "Direct link to Plugin API Specific Options")

Here are some plugin specific manifest options that are also applicable to widgets:

### api: string

The version of the Figma Plugin API used by the widget. **We recommend updating to the latest version whenever possible** to get the latest features, bug fixes, and documentation.

---

### permissions?: PermissionType[]

This allows you to specify what permissions your widget wants access to.

```
type PermissionType =  
 "currentuser" |  
 "activeusers"
```

info

`activeuser` must be specified if your widget uses `figma.activeUser` and `currentuser` must be specified if your widget uses `figma.currentUser`.

---

### enableProposedApi?: boolean

See [Plugin Proposed API](../plugins/proposed-api.md).

caution

This flag is only meant for development, and will not work in published widgets!

---

### enablePrivatePluginApi?: boolean

This enables Plugin API that's specific to private widgets.
Setting this will also enable local widgets to work with these APIs during development.

---

[Previous

API Reference](api/api-reference.md)[Next

The Typings File](api/typings.md)

- [Plugin API Specific Options](#plugin-api-specific-options)
