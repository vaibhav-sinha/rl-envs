<!-- source: https://developers.figma.com/docs/plugins/how-plugins-run -->

- Plugins
- Basics of Plugins
- How Plugins Run

On this page

Figma plugins are written using primarily JavaScript and HTML. The environment exposed to plugins by the Figma editor, FigJam, Figma Slides, and Figma Buzz is very similar to a standard web browser and includes many of the same features. There are, however, some important differences.

In order for a plugin system to be secure and stable, some browser APIs are unavailable or need to be accessed differently. This is imporant to understand so you can answer questions like:

- How do I [access the contents of a Figma file](accessing-document.md)?
- How do I create a [user interface for my plugin](creating-ui.md)?
- How do I [make network requests](making-network-requests.md)?

## Plugin environment[​](#plugin-environment "Direct link to Plugin environment")

For performance, Figma uses an execution model where plugin code runs on the **main thread in a sandbox**. The sandbox is a minimal JavaScript environment and **does not expose browser APIs**. This means that you have access to modern JavaScript (ES2020 and beyond), including:

- **Core language features:** classes with private fields and static blocks, generators and async generators, `async`/`await`, destructuring, template literals, `for...of` loops, modules
- **ES2020+ syntax:** optional chaining (`?.`), nullish coalescing (`??`), logical assignment operators (`||=`, `&&=`, `??=`), `BigInt`
- **Standard built-ins:** `Array`, `Object`, `Map`, `Set`, `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`, `Proxy`, `Reflect`, `Symbol`
- **Numeric types:** `BigInt`, `ArrayBuffer`, typed arrays including `Uint8Array`, `Float32Array`, etc.
- **Async primitives:** `Promise` (including `Promise.allSettled`, `Promise.any`, `Promise.withResolvers`), `async`/`await`
- **Standard APIs:** `JSON`, `Math`, `Date`, `RegExp` (including `v` flag and named capture groups), `structuredClone`
- **Iteration protocol:** `Symbol.iterator`, `Symbol.asyncIterator`, iterators and async iterators

We have also added a minimal version of the `console` API. But browser APIs like `XMLHttpRequest`, `fetch`, `setTimeout`, and the DOM are not *directly* available from the sandbox.

To use browser APIs or show a custom UI for your plugin, you need to create an `<iframe>` with a `<script>` tag inside. This can be done with [`figma.showUI()`](creating-ui.md). Inside of this `<iframe>`, you can write any HTML/JavaScript and access any browser APIs. To see the list of available JavaScript/Browser APIs on the main thread, run `console.log(this)` as the first line of your plugin.

The main thread can access the Figma "scene" (the hierarchy of layers that make up a Figma document) but not the browser APIs. Conversely, the iframe can access the browser APIs, but not the Figma scene. The main thread and the iframe can communicate with each other through **message passing**.

![](https://static.figma.com/uploads/04c4c6293fce2a7fe67bccd385ee5ab998705780)

Additional network security is enforced if your plugin [limits network access](manifest.md#networkaccess). When network access is limited, if your plugin attempts to access a domain that isn't specified in your plugin's manifest, Figma blocks that attempt and returns a content-security policy (CSP) error.

The enforcement of domain access is limited only to requests made by the plugin, such as Fetch API requests to a public REST API. If your plugin renders a website in an iframe, network access limits only apply directly to the website's domain. Network access limits do not affect resources needed by that website. For example, suppose your plugin limits access only to `figma.com`. Your plugin would be prevented from rendering content from other domains. However, `figma.com` would still be able to load external resources, such as scripts for Google Analytics.

When the plugin is finished with its work, it must call `figma.closePlugin()` to tell Figma that it is finished. If a plugin is not properly closed, the plugin runs indefinitely and the user sees a "Running [your plugin name]" toast notification until they close the tab.

Note that the user can cancel the plugin at any point by using the UI that Figma displays while the plugin is running. When this happens, Figma will itself call `figma.closePlugin()`.

## File loading[​](#file-loading "Direct link to File loading")

Pages in Figma files are loaded as needed, and most plugins will *not* require access to a user’s complete Figma document. If your plugin acts on multiple or all pages in a user's file, you can still improve the experience of users in a very large file by having your plugin [load more pages only as needed](accessing-document.md). To help, TypeScript type definitions are available in our [official typings](https://github.com/figma/plugin-typings).

[Previous

Setting editor type](setting-editor-type.md)[Next

Accessing the Document](accessing-document.md)

- [Plugin environment](#plugin-environment)
- [File loading](#file-loading)
