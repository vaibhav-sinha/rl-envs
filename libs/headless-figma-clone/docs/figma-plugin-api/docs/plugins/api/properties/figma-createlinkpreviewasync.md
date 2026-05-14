<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createlinkpreviewasync -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createLinkPreviewAsync

On this page

info

This API is only available in FigJam.

Resolves link metadata from a URL, and inserts either an embed or a unfurled preview of the link into the document
An embed will be inserted if the URL is a valid OEmbed provider (has a `<link type="application/json+oembed" ... />` tag). The returned `<iframe>` source will be converted into an EmbedNode.

Otherwise, the title, description, thumbnail, and favicon will be parsed from the HTML markup of the URL using standard `og` or `twitter` meta tags. This information will be converted into a LinkUnfurlNode.

## Signature[​](#signature "Direct link to Signature")

### [createLinkPreviewAsync](figma-createlinkpreviewasync.md)(url: string): Promise<[EmbedNode](../EmbedNode.md) | [LinkUnfurlNode](../LinkUnfurlNode.md)>

## Parameters[​](#parameters "Direct link to Parameters")

### url[​](#url "Direct link to url")

## Remarks[​](#remarks "Direct link to Remarks")

This API is only available in FigJam

Creating embeds and link unfurl nodes

```
(async () => {  
  // Creates an EmbedNode  
  const youtubeEmbed = await figma.createLinkPreviewAsync('https://www.youtube.com/watch?v=4G9RHt2OyuY')  
  
  // Creates a LinkUnfurlNode  
  const unfurledLink = await figma.createLinkPreviewAsync('https://www.figma.com/community/plugins')  
})()
```

[Previous

createVideoAsync](figma-createvideoasync.md)[Next

createGif](figma-creategif.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [url](#url)
- [Remarks](#remarks)
