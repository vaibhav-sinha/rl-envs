<!-- source: https://developers.figma.com/docs/rest-api/projects-endpoints -->

- REST API
- Projects
- Endpoints

On this page

See information about your projects and files within a project.

info

**Limited Access**

The `projects` endpoints cannot be used with [public OAuth apps](authentication.md#create-an-oauth-app).

## GET team projects[​](#get-team-projects-endpoint "Direct link to GET team projects")

You can use this endpoint to get a list of all the projects within the specified team. It returns only projects visible to the authenticated user or owner of the developer token.

It is not possible to programmatically obtain team IDs. To obtain a team ID, navigate to the team page in the Figma file browser. The team ID is present in the URL after the word team and before your team name.

info

This is a [Tier 2 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`projects:read` scope](scopes.md).

### HTTP Endpoint[​](#http-endpoint "Direct link to HTTP Endpoint")

`GET /v1/teams/:team_id/projects`

| Path parameters | Description |
| --- | --- |
| team\_id | String  ID of the team to list projects from |

| Error codes | Description |
| --- | --- |
| 400 | Error with the request. The "message" param on the response will describe the error. |
| 403 | The developer / OAuth token is invalid or expired |

## GET project files[​](#get-project-files-endpoint "Direct link to GET project files")

List the files in a given project.

info

This is a [Tier 2 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`projects:read` scope](scopes.md).

### HTTP Endpoint[​](#http-endpoint-1 "Direct link to HTTP Endpoint")

`GET /v1/projects/:project_id/files`

| Path parameters | Description |
| --- | --- |
| project\_id | String  ID of the project to list files from |
| branch\_data | Booleandefault: false  Returns branch metadata in the response for each main file with a branch inside the project. |

| Error codes | Description |
| --- | --- |
| 400 | Error with the request. The `message` param on the response will describe the error. |
| 403 | The developer / OAuth token is invalid or expired |

## GET project metadata[​](#get-project-metadata-endpoint "Direct link to GET project metadata")

Returns basic metadata about a project, such as its name, thumbnail, file count, and timestamps. Use this endpoint when you need a lightweight project preview without enumerating individual files, such as for link unfurling or search results.

This endpoint does not return any file-level data or document content. You should use this endpoint instead of `GET /v1/projects/:id/files` when you only need a high-level project preview.

`thumbnail_url` may be null if the project has no files.

info

This is a [Tier 3 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`project_metadata:read` scope](scopes.md) or [`projects:read` scope](scopes.md).

note

Unlike other endpoints in this section, `GET /v1/projects/:project_id/meta` is available to personal access tokens (PATs) and plan-level access tokens (PLANTs). It is not available to public OAuth apps.

### HTTP Endpoint[​](#http-endpoint-2 "Direct link to HTTP Endpoint")

`GET /v1/projects/:project_id/meta`

**Return value**

```
{  
  "id": String,  
  "name": String,  
  "thumbnail_url": String,  
  "file_count": Number,  
  "updated_at": String,  
  "created_at": String  
}
```

| Path parameters | Description |
| --- | --- |
| project\_id | String  The unique ID of the project. This can be parsed from any Figma project URL: `https://www.figma.com/project/:project_id/:project_name` |

| Error codes | Description |
| --- | --- |
| 403 | The developer / OAuth token is invalid or expired, or does not include the `project_metadata:read` scope |
| 404 | The specified project was not found |
| 429 | The request was rate-limited |

[Previous

Types](projects-types.md)

- [GET team projects](#get-team-projects-endpoint)
- [GET project files](#get-project-files-endpoint)
- [GET project metadata](#get-project-metadata-endpoint)
