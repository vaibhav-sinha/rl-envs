<!-- source: https://developers.figma.com/docs/embeds/embed-figma-file -->

- Embeds
- Embed a Figma file

On this page

To embed a Figma design or FigJam board, you create an iframe, provide the URL to the Figma file, and use query parameters to customize how the embed can be viewed and used. This section includes an example of an embedded file and the attributes of the iframe, how to format the URL, and the query parameters that are available.

### Example file embed[​](#example-file-embed "Direct link to Example file embed")

```
<iframe  
  src="https://embed.figma.com/design/nrPSsILSYjesyc5UHjYYa4?embed-host=figma-embed-docs"  
  height="450px" width="100%"  
  allowFullscreen  
</iframe>
```

The HTML in the example includes the `iframe` element, which is used to embed your Figma file. The `iframe` in the example has several attributes:

- The `src` attribute is used to specify the URL to the file you want to embed and includes required and optional query parameters
- The recommended `height` and `width` attributes
- The optional `allowFullscreen` attribute, which lets viewers expand the embed to fill their screen

Embeds support more attributes and parameters than those used in the example. For details and reference about setting up your embed, see the following sections:

- [iframe format for embeds](#iframe-format)
- [URL format for embeds](#url-format)
- [Query parameters for files](#query-parameters-files)

## iframe format for embeds[​](#iframe-format "Direct link to iframe format for embeds")

Figma files and prototypes are embedded using the `iframe` element. The following example is the simplest version of a functional embed:

```
<iframe src="https://embed.figma.com/{design|board|proto}/:file_key"></iframe>
```

`src` is the only required attribute for the iframe. See [URL format](#url-format) for how to build the URL for your `src` attribute.

You can also add [standard attributes supported by iframes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attributes), such as `allowFullscreen`, `height`, `width`, and `style`. The order of the attributes doesn't matter. For example:

```
<iframe  
  style="border: 1px solid rgba(0, 0, 0, 0.1);"  
  width="800"  
  height="450"  
  src="https://embed.figma.com/{design|board|proto}/:file_key"  
  allowfullscreen  
>  
</iframe>
```

## URL format for embeds[​](#url-format "Direct link to URL format for embeds")

To get the base URL for the file or prototype that you want to embed, take the current URL for the file or prototype and replace `www` with `embed`. For example:

| File URL | Embed URL |
| --- | --- |
| https://**www**.figma.com/design/BAZsTPbh6W1r66Bdo/Example-design-file | https://**embed**.figma.com/design/BAZsTPbh6W1r66Bdo/Example-design-file |
| https://**www**.figma.com/proto/AZBcScMePxSpiX9j/Prototype-examples-for-embed?node-id=2654-15 | https://**embed**.figma.com/proto/AZBcScMePxSpiX9j/Prototype-examples-for-embed?node-id=2654-15 |

When you have the base URL, you can then apply the required and optional query parameters for your embedded [file](#query-parameters-files) or [prototype](embed-figma-prototype.md#query-parameters-prototypes).

Embeds use the following URL format for the `src` attribute of your `iframe`:

```
https://embed.figma.com/{design|board|proto}/:file_key
```

Where:

- `design`, `proto`, `board`, `slides`, or `deck` corresponds to the type of file being embedded. For example, to embed a Figma design, you use `https://embed.figma.com/design/:file_key`.
- `:file_key` is the file key of the file or prototype that you want to embed. The file key is obtained from the URL of the Figma file. For example, in `https://www.figma.com/board/BAZsTPbh6W1r66Bdo/Example-FigJam-board`, the file key is `BAZsTPbh6W1r66Bdo`.
- The file name (the hyphenated string that usually follows the file key in a Figma URL) can be included in the URL. If the file name changes, your embed is unaffected.

If you want to programmatically validate Figma URLs and convert them to embeds, see [Determine if a URL is a Figma URL](resources.md#check-figma-url).

## Query parameters for files[​](#query-parameters-files "Direct link to Query parameters for files")

The following table lists the required and optional query parameters that can be used to customize the experience of an embedded Figma file.

Query parameters are added at the end of a URL. The first query parameter is preceded by a `?`, and following query parameters are preceded by `&`. For example, this URL has two query parameters: `https://embed.figma.com/design/BAZsTPbh6W1r66Bdo?embed-host=example-product&node-id=0-3`

The default values for the query parameters are provided. If you want to use the default value of an optional query parameter, you do not need to include the parameter in your embed URL.

| Parameter | Value | Description | Example |
| --- | --- | --- | --- |
| `embed-host` (required) |  | A unique string that you use to identify the host where you're embedding the file, such as the name of your site or product. | `embed-host=example-product` |
| `mode` / `m` | Valid values:  - dev | When set to `dev`, the embedded file is opened in Dev Mode. | `mode=dev` |
| `node-id` |  | The id for the node that you want the embed to display, such as a page or frame. | `node-id=0-3` |
| `footer` | Default value: `true` | Whether the Figma footer is displayed at the bottom of the embedded file's viewport. | `footer=false` |
| `viewport-controls` | Default value: `true` | When `true`, the user can pan and zoom in the embed.  For embedded Slides files, when `true`, the user can navigate to a different slide. | `viewport-controls=false` |
| `page-selector` | Default value: `true` | When `true`, the page selector is shown and the viewer can change pages. | `page-selector=false` |
| `theme` | Default value: `light`  Valid values:  - `light` - `dark` - `system` | Specifies whether to use light, dark, or the viewer's system theme for the embed interface. | `theme=system` |

[Previous

Security and access](security-access.md)[Next

Embed a Figma prototype](embed-figma-prototype.md)

- [Example file embed](#example-file-embed)
- [iframe format for embeds](#iframe-format)
- [URL format for embeds](#url-format)
- [Query parameters for files](#query-parameters-files)
