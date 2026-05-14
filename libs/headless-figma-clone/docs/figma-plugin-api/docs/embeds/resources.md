<!-- source: https://developers.figma.com/docs/embeds/resources -->

- Embeds
- Resources

On this page

This section contains resources for the Figma Embed Kit.

## Determine if a URL is a Figma URL[​](#check-figma-url "Direct link to Determine if a URL is a Figma URL")

Embeds are only supported for Figma URLs that link to either a Figma design file, a FigJam board, or a prototype. If you're ingesting URLs programmatically, you may want to validate that the URLs are the correct format for Figma files and prototypes.

To recognize these Figma links and render them successfully in your tool, use the following regular expression ("regex"):

```
const URL_REGEX = /https:\/\/[\w\.-]+\.?figma.com\/([\w-]+)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
```

Any URL that matches the preceding regex is guaranteed to be handled by our embed endpoint, including any of the following URL types:

- `https://www.figma.com/board/:file_key/:file_name` → FigJam files
- `https://www.figma.com/slides/:file_key/:file_name` → Figma Slides files
- `https://www.figma.com/deck/:file_key/:file_name` → Figma Slides files in presentation view
- `https://www.figma.com/design/:file_key/:file_name` → Figma Design files, opened in design mode
- `https://www.figma.com/design/:file_key/:file_name?m=dev` → Figma Design files, opened in Dev Mode
- `https://www.figma.com/:file_type/:file_key/:file_name` → in future, we might add new file types

To turn the URLs into embeds, ensure that the `www.figma.com` or `figma.com` portion of the URL becomes `embed.figma.com`, and then apply required and optional query parameters for the [file](embed-figma-file.md#query-parameters-files) or [prototype](embed-figma-prototype.md#query-parameters-prototypes).

## Find node ids[​](#find-node-ids "Direct link to Find node ids")

When you're working with embedded files and prototypes, you may want to reference specific nodes by id, such as when using the `node-id` query parameter.

There are a few ways you can find the id for a node.

### Embed API[​](#embed-api "Direct link to Embed API")

If you're using the Embed API with an embedded prototype, you can get node ids from the following events:

- [`MOUSE_PRESS_OR_RELEASE`](#mouse-press)
- [`PRESENTED_NODE_CHANGED`](#presented-node-changed)
- [`NEW_STATE`](#new-state)

### Figma URLs[​](#figma-urls "Direct link to Figma URLs")

In Figma, when you select most layers, the node id is included in the URL of the Figma file with the `node-id` query parameter (same as embed URLs). This can be a quick way to find most node ids, but won't work for certain objects, such as component variants.

For example, assume you've selected the first frame of a prototype flow in a Figma design file. In your browser, the URL for your Figma file looks like this: `https://www.figma.com/design/BAZsTPbh6W1r66Bdo/Example-file-name?node-id=5-3`. The `node-id` query parameter is `5-3`, the id of the node you've selected in this example. For use with the Embed API, you convert the hyphen to a colon (`5-3` becomes `5:3`).

### Developer console[​](#developer-console "Direct link to Developer console")

Using the developer console in the Figma desktop app or the developer tools in your browser, you can get the ids of the nodes you currently have selected on the canvas in your file. In the console, use `figma.currentPage.selection`.

`figma.currentPage.selection` returns an array, even when only one node is selected. If you only have one node selected, use `figma.currentPage.selection[0].id` to get the id of that node.

To open the console in the Figma desktop app, use the shortcut `⌥⌘I`, or right-click on the canvas and go to **Plugins > Development > Show/Hide console**.

## Migrate Embed Kit 1.0 embeds[​](#migrate-embed-kit-10-embeds "Direct link to Migrate Embed Kit 1.0 embeds")

To take advantage of the new features that are available, migrate your embeds from Embed Kit 1.0 to [Embed Kit 2.0](embed-kit-2.0.md).

To migrate your old embeds:

1. Get the URL of your Embed Kit 1.0 embedded file or prototype. The embed URL is found in the `src` attribute of your embed iframe.
2. Remove `https://www.figma.com/embed`. This URL isn't used for Embed Kit 2.0.
3. Get the value of the `url` query parameter in the URL. If the value is URL-encoded, also decode the value. The `url` value is the URL for the file or prototype that you embedded.  
     
   For example: `https%3A%2F%2Fwww.figma.com%2Fdesign%2FBAZsTPbh6W1r66Bdo` becomes `https://www.figma.com/design/BAZsTPbh6W1r66Bdo`
4. Change the subdomain from `www` to `embed`.  
     
   For example: `https://www.figma.com/design/BAZsTPbh6W1r66Bdo` becomes `https://embed.figma.com/design/BAZsTPbh6W1r66Bdo`
5. Fix the query parameters for the URL:
   - Copy the `embed_host` value to the `embed-host` parameter for the new URL. This query parameter is still required for Embed Kit 2.0.
   - If it was originally included, discard the `embed_origin` parameter. This parameter is not used with Embed Kit 2.0.  
       
     If you want to continue to control prototypes, follow the steps to get started with the Embed API, and then add the `client-id` parameter to the new embed URL.
   - Copy any remaining query parameters to the new URL. With the exception of `embed_origin`, Embed Kit 2.0 supports all of the parameters provided by Embed Kit 1.0.

Example of migrating the URL for a file embed:

```
Embed Kit 1.0:  
https://www.figma.com/embed?url=https%3A%2F%2Fwww.figma.com%2Fdesign%2FBAZsTPbh6W1r66Bdo&embed_host=example-product&node_id=0-3
```

```
Embed Kit 2.0:  
https://embed.figma.com/design/BAZsTPbh6W1r66Bdo?embed-host=example&node-id=0-3
```

Example of migrating the URL for a prototype embed:

```
Embed Kit 1.0:  
https://www.figma.com/embed?url=https%3A%2F%2Fwww.figma.com%2Fproto%2FBAZsTPbh6W1r66Bdo&embed_host=example-product&node_id=0-3&embed_origin=https://example.com
```

```
Embed Kit 2.0:  
https://embed.figma.com/proto/BAZsTPbh6W1r66Bdo?embed-host=example&node-id=0-3&client-id=6rtt685EC
```

### Example migration function[​](#example-migration-function "Direct link to Example migration function")

The following example JavaScript function migrates the URL for an embed from Embed Kit 1.0 to Embed Kit 2.0.

```
function migrateEmbedURL(embedV1URL) {  
    // Parse the input URL  
    const oldURL = new URL(embedV1URL);  
    const params = new URLSearchParams(oldURL.search);  
  
    // Get the value of the 'url' parameter, decode it, and discard it  
    let embedURL = decodeURIComponent(params.get('url'));  
    params.delete('url');  
  
    // Convert the subdomain of embedURL from 'www' to 'embed'  
    let embedURLObj = new URL(embedURL);  
    if (embedURLObj.hostname.startsWith('www')) {  
        embedURLObj.hostname = 'embed' + embedURLObj.hostname.slice(3);  
    }  
  
    // Merge query parameters from embedURLObj into params  
    const embedURLParams = new URLSearchParams(embedURLObj.search);  
    for (const [key, value] of embedURLParams.entries()) {  
        params.append(key, value);  
    }  
  
    // Check for the 'embed_origin' parameter, warn if present, and discard it  
    if (params.has('embed_origin')) {  
        console.warn('embed_origin parameter is present:', params.get('embed_origin'));  
        params.delete('embed_origin');  
    }  
  
    // Construct the new URL using the value of embedURL and remaining query parameters  
    const newParams = new URLSearchParams();  
    for (const [key, value] of params.entries()) {  
        const newKey = key.replace(/_/g, '-');  
        newParams.append(newKey, value);  
    }  
  
    // Combine the new URL and the new parameters  
    embedURLObj.search = newParams.toString();  
    const newURL = embedURLObj.toString();  
  
    return newURL;  
}
```

[Previous

Embed API](embed-api.md)[Next

Troubleshooting](troubleshooting.md)

- [Determine if a URL is a Figma URL](#check-figma-url)
- [Find node ids](#find-node-ids)
  - [Embed API](#embed-api)
  - [Figma URLs](#figma-urls)
  - [Developer console](#developer-console)
- [Migrate Embed Kit 1.0 embeds](#migrate-embed-kit-10-embeds)
  - [Example migration function](#example-migration-function)
