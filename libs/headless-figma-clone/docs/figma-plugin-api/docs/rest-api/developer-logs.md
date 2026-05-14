<!-- source: https://developers.figma.com/docs/rest-api/developer-logs -->

- REST API
- Developer logs
- Getting started

On this page

## Getting started[​](#getting-started "Direct link to Getting started")

### Who can use the Developer Logs API[​](#who-can-use-the-developer-logs-api "Direct link to Who can use the Developer Logs API")

- The Developer Logs API is only available to organizations on the Enterprise plan with the [Governance+ add-on](https://help.figma.com/hc/articles/31825370509591).
- Only organization administrators can access developer logs.

The Developer Logs API lets you fetch a granular log of API calls made to the [REST API](../rest-api.md) or [MCP server](../figma-mcp-server.md) within your organization. This is a companion to the more low-volume, high-signal security and compliance logs available through [Activity Logs](activity-logs.md).

With the Developer Logs API, you can:

- Investigate API access patterns across your organization.
- Audit API usage in the event of a token leak.
- Monitor how the MCP server is being used.

Organization administrators can also access developer logs in the Figma UI at [figma.com/developers/log](https://www.figma.com/developers/log).

info

Developer log records are retained for the last 30 days. Both the UI and the REST API endpoint are limited to this window.

To make requests to the Developer Logs API, your access token must include the `org:developer_log_read` scope. This endpoint can only be used with a [plan access token](plan-access-tokens.md).

The following table describes the requirements.

|  | `POST` |
| --- | --- |
| **Plan** | Enterprise with Governance+ |
| **Account type** | Organization administrator |
| **Token type** | Plan access token |
| **Token scopes** | `org:developer_log_read` |

[Next

Endpoints](developer-logs-endpoints.md)

- [Getting started](#getting-started)
  - [Who can use the Developer Logs API](#who-can-use-the-developer-logs-api)
