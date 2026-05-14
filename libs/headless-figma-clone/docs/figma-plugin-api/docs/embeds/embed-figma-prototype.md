<!-- source: https://developers.figma.com/docs/embeds/embed-figma-prototype -->

- Embeds
- Embed a Figma prototype

On this page

Prototypes are embedded much the same way as files: you create an iframe, provide the embed URL to the Figma prototype, and use query parameters to customize how the embedded prototype can be viewed and used. This section includes an example of an embedded prototype and the query parameters that are available.

### Example prototype embed[​](#example-prototype-embed "Direct link to Example prototype embed")

```
<iframe  
  src="https://embed.figma.com/proto/nrPSsILSYjesyc5UHjYYa4?node-id=5-3&starting-point-node-id=5%3A3&embed-host=figma-embed-docs"  
  height="450px"  
  width="100%"  
  allowfullscreen  
>  
</iframe>
```

The HTML in the example includes the `iframe` element, which is used to embed your Figma prototype. The iframe in the example has several attributes:

- The `src` attribute is used to specify the URL to the prototype you want to embed and includes required and optional query parameters
- The recommended `height` and `width` attributes

Embeds support more attributes and parameters than those used in the example. The general iframe and URL formats are the same for embedded prototypes as for files. For details about setting up your embed, see the following sections:

- [iframe format for embeds](embed-figma-file.md#iframe-format)
- [URL format for embeds](embed-figma-file.md#url-format)
- [Query parameters for prototypes](#query-parameters-prototypes)

## Query parameters for prototypes[​](#query-parameters-prototypes "Direct link to Query parameters for prototypes")

The following table lists the required and optional query parameters that can be used to customize the experience of an embedded Figma prototype.

Query parameters are added at the end of a URL. The first query parameter is preceded by a `?`, and following query parameters are preceded by `&`. For example, this URL has two query parameters: `https://embed.figma.com/proto/BAZsTPbh6W1r66Bdo?embed-host=example-product&client-id=6rtt685EC`

The default values for the query parameters are provided. If you want to use the default value of an optional query parameter, you do not need to include the parameter in your embed URL.

| Parameter | Value | Description | Example |
| --- | --- | --- | --- |
| `embed-host` (required) |  | A unique string that you use to identify the host where you're embedding the prototype, such as the name of your site or product. | `embed-host=example-product` |
| `client-id` (required for [Embed API](embed-api.md)) |  | The client id of the [OAuth app](https://figma.com/developers/apps) you set up.  `client-id` is required to use the Embed API with your embedded prototype.  If you don't want to use the Embed API to send messages to or get events from the prototype, you can exclude `client-id`. | `client-id=6rtt685EC` |
| `node-id` |  | The id of the node to focus on when the embedded prototype loads. If `node-id` and `starting-point-node-id` are both used, your embedded prototype will load displaying the node for `node-id`.  If the value for `node-id` and `starting-point-node-id` are different, when the prototype is restarted, the flow will start from `starting-point-node-id`.  If neither `node-id` or `starting-point-node-id` are used, the default prototype flow in the file is embedded. | `node-id=0-3` |
| `starting-point-node-id` |  | The id of the node that starts the prototype flow that you want to embed.  If `starting-point-node-id` is used, your embedded prototype will always restart from the node you specify. If `node-id` and `starting-point-node-id` are both used, but have different values, the node for `node-id` will appear only when the embed loads. If the prototype is restarted, `starting-point-node-id` is used instead.  If neither `node-id` or `starting-point-node-id` are used, the default prototype flow in the file is embedded. | `starting-point-node-id=0-3` |
| `version-id` |  | The id of a specific version of the prototype you want to embed. Omitting this will use the latest version of the file. | `version-id=1234567890123456789` |
| `footer` | Default value: `true` | Whether the Figma footer is displayed at the bottom of the embedded file's viewport. | `footer=false` |
| `viewport-controls` | Default value: `true` | When `true`, the user can pan and zoom in the embed.  For embedded Slides files, when `true`, the user can navigate to a different slide. | `viewport-controls=false` |
| `disable-default-keyboard-nav` | Default value: `false` | When `true`, the default keyboard shortcuts for navigating prototypes are disabled. | `disable-default-keyboard-nav=true` |
| `show-proto-sidebar` | Default value: `false` | Whether to show a left sidebar that lists all the prototype flows in the embed. | `show-proto-sidebar=true` |
| `hotspot-hints` | Default value: `true` | When `true`, clickable areas of the prototype are highlighted when the user clicks in the prototype. | `hotspot-hints=false` |
| `device-frame` | Default value: `true` | Whether to show the device frame for the prototype. | `device-frame=false` |
| `scaling` | Default value: `scale-down`  Valid values:  - `scale-down` - `contain` - `min-zoom` - `scale-down-width` - `fit-width` - `free` | Determines the scaling mode for the prototype. These settings are equivalent to the scaling options available when you play or share a prototype.  [Play your prototypes: Preview a prototype →](https://help.figma.com/hc/articles/360040318013-Play-your-prototypes#h_01HER6XXFTX7SWE6EH2005DVZP) | `scaling=contain` |
| `content-scaling` | Default value: `fixed`  Valid values:  - `fixed` - `responsive` | Determines the way content is scaled in the prototype. These settings are equivalent to the content scaling options available when you play or share a prototype.  [Play your prototypes: Preview a prototype →](https://help.figma.com/hc/articles/360040318013-Play-your-prototypes#h_01HER6XXFTX7SWE6EH2005DVZP) | `content-scaling=responsive` |

[Previous

Embed a Figma file](embed-figma-file.md)[Next

Embed API](embed-api.md)

- [Example prototype embed](#example-prototype-embed)
- [Query parameters for prototypes](#query-parameters-prototypes)
