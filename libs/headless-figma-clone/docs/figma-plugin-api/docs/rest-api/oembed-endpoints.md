<!-- source: https://developers.figma.com/docs/rest-api/oembed-endpoints -->

- REST API
- oEmbed
- Endpoints

On this page

The oEmbed endpoint allows third-party services to retrieve rich embed metadata for Figma files and published Makes. This follows the [oEmbed 1.0 specification](https://oembed.com/).

## GET oEmbed[​](#get-oembed-endpoint "Direct link to GET oEmbed")

Returns oEmbed metadata for a Figma file or published Make URL.

info

This is a [Tier 3 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`file_metadata:read` scope](scopes.md).

### HTTP endpoint[​](#http-endpoint "Direct link to HTTP endpoint")

`GET /v1/oembed`

**Return value**

```
{  
  "version": "1.0",  
  "type": "rich",  
  "title": String,  
  "key": String,  
  "url": String,  
  "provider_name": String,  
  "provider_url": String,  
  "cache_age": Number,  
  "width": Number,  
  "height": Number,  
  "html": String,  
  "is_published_site": Boolean,  
  "folder_name": String,  
  "thumbnail_url": String,  
  "thumbnail_width": Number,  
  "thumbnail_height": Number  
}
```

| Query parameters | Description |
| --- | --- |
| url | Stringrequired  The URL of the Figma file or published Make to retrieve oEmbed data for. Must be a valid Figma URL (e.g. `https://www.figma.com/design/:key/:name` or `https://example.figma.site`). |
| maxwidth | Numberoptional  Maximum width of the embed in pixels. Defaults to `800`. The response width will be adjusted to maintain a 16:9 aspect ratio with `maxheight`. |
| maxheight | Numberoptional  Maximum height of the embed in pixels. Defaults to `450`. The response height will be adjusted to maintain a 16:9 aspect ratio with `maxwidth`. |

### Response[​](#response "Direct link to Response")

| Field | Description |
| --- | --- |
| version | String  oEmbed specification version. Always `"1.0"`. |
| type | String  oEmbed response type. Always `"rich"`. |
| title | String  The title of the Figma file or published Make. |
| key | Stringoptional  The key of the Figma file. Not present for published Makes. |
| url | String  The canonical URL of the resource. |
| provider\_name | String  The name of the content provider (`"Figma"` or `"Make"`). |
| provider\_url | String  The URL of the content provider's website. |
| cache\_age | Number  Suggested cache lifetime for this response in seconds. Always `3600`. |
| width | Number  Width of the embed in pixels. |
| height | Number  Height of the embed in pixels. |
| html | String  The HTML required to embed the resource. Contains an `iframe` pointing to the Figma embed URL. |
| is\_published\_site | Booleanoptional  Only present and `true` when the resource is a published Make. |
| folder\_name | Stringoptional  The name of the folder containing the file, if the file resides in a folder. |
| thumbnail\_url | Stringoptional  URL of a thumbnail image representing the resource. Only present when a thumbnail is available. |
| thumbnail\_width | Numberoptional  Width of the thumbnail image in pixels. Only present when `thumbnail_url` is present. |
| thumbnail\_height | Numberoptional  Height of the thumbnail image in pixels. Only present when `thumbnail_url` is present. |

| Error codes | Description |
| --- | --- |
| 400 | The `url` parameter is missing or not a valid Figma URL. |
| 404 | The file or published site was not found, or does not have public link access. |
| 429 | Too many requests. See [rate limits](rate-limits.md). |
| 501 | Not Implemented. The server does not support the functionality required to fulfill the request. |

### Example request[​](#example-request "Direct link to Example request")

```
GET https://api.figma.com/v1/oembed?url=https%3A%2F%2Fwww.figma.com%2Fdesign%2FabcXYZ%2FMy-Design&maxwidth=800&maxheight=450
```

### Example response[​](#example-response "Direct link to Example response")

```
{  
  "version": "1.0",  
  "type": "rich",  
  "title": "My Design",  
  "key": "abcXYZ",  
  "url": "https://www.figma.com/design/abcXYZ/My-Design",  
  "provider_name": "Figma",  
  "provider_url": "https://www.figma.com",  
  "cache_age": 3600,  
  "width": 800,  
  "height": 450,  
  "html": "<iframe src=\"https://www.figma.com/embed?embed_host=oembed&url=https://www.figma.com/design/abcXYZ/My-Design\" width=\"800\" height=\"450\" allowfullscreen></iframe>",  
  "thumbnail_url": "https://api-cdn.figma.com/resize/thumbnails/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx?height=450",  
  "thumbnail_width": 800,  
  "thumbnail_height": 450  
}
```

[Previous

Endpoints](library-analytics-endpoints.md)

- [GET oEmbed](#get-oembed-endpoint)
