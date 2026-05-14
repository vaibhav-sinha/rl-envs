<!-- source: https://developers.figma.com/docs/rest-api/users-endpoints -->

- REST API
- Users
- Endpoints

On this page

You can use the users endpoint to access information regarding the currently authenticated user. When using OAuth 2, the user in question must be authenticated through the Figma API to access their information.

## GET me[​](#get-me-endpoint "Direct link to GET me")

If you are using OAuth for authentication, this endpoint can be used to get user information for the authenticated user.

info

This is a [Tier 3 endpoint](rate-limits.md#rate-limits-tier-table) and requires the [`current_user:read` scope](scopes.md).

### HTTP Endpoint[​](#http-endpoint "Direct link to HTTP Endpoint")

`GET /v1/me`

**Return value**

[User](users-types.md#user-type)

[Previous

Types](users-types.md)

- [GET me](#get-me-endpoint)
