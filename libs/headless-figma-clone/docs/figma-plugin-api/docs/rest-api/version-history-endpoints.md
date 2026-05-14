<!-- source: https://developers.figma.com/docs/rest-api/version-history-endpoints -->

- REST API
- Version history
- Endpoints

On this page

## GET file versions[​](#get-file-versions-endpoint "Direct link to GET file versions")

A list of the versions of a file.

info

This is a [Tier 2 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`file_versions:read` scope](scopes.md).

### HTTP Endpoint[​](#http-endpoint "Direct link to HTTP Endpoint")

`GET /v1/files/:key/versions`

**Return value**

```
{  
  "versions": Version[],  
  "pagination": {  
     "prev_page": String,  
     "next_page": String  
   }  
}
```

| Path parameters | Description |
| --- | --- |
| key | `key`String  File to get version history from. This can be a file key or branch key. Use `GET /v1/files/:key` with the `branch_data` query param to get the branch key. |

| Error code | Description |
| --- | --- |
| 403 | The developer / OAuth token is invalid or expired |
| 404 | The specified file was not found |

[Previous

Types](version-history-types.md)

- [GET file versions](#get-file-versions-endpoint)
