<!-- source: https://developers.figma.com/docs/rest-api/scopes -->

- REST API
- Authentication
- Scopes

On this page

Scopes for [personal access tokens](authentication.md#access-tokens) and [OAuth 2 tokens](authentication.md#oauth-apps) determine which endpoints can be accessed.

The following table lists the scopes that are available.

**Important**: Scopes do not supersede the permissions granted to you by an organization or the owner of a project, team, or file. You can only access files that you've created or that have been shared with you (whether shared directly, or because you belong to a corresponding project or team). Similarly, if you listed projects and teams, you'd only see the projects and teams that you can access in Figma's file browser.

| Scope | Description |
| --- | --- |
| `current_user:read` | Read your name, email, and profile image. |
| `file_comments:read` | Read the comments for files. |
| `file_comments:write` | Post and delete comments and comment reactions in files. |
| `file_content:read` | Read the contents of files, such as nodes and the editor type. |
| `file_dev_resources:read` | Read dev resources in files. |
| `file_dev_resources:write` | Write dev resources to files. |
| `file_metadata:read` | Read metadata of files. |
| `file_variables:read` | Read variables in files. Note: Enterprise plan only. |
| `file_variables:write` | Write variables and collections in files. Note: Enterprise plan only. |
| `file_versions:read` | Read the version history for files you can access. |
| `files:read` | **Deprecated**. Read files, projects, users, versions, comments, components, styles, and webhooks. While this scope will continue to work, it's highly recommended you use the granular scopes Figma provides. Because `files:read` is extremely permissive, more limited scopes such as `file_content:read` and `file_comments:read` provide enhanced security and stability by reducing the surface of access to your files. |
| `library_analytics:read` | Read your design system analytics. Note: Enterprise plan only. |
| `library_assets:read` | Read data of individual published components and styles. |
| `library_content:read` | Read published components and styles of files. |
| `org:activity_log_read` | Read organization [activity logs](activity-logs.md). Note: Enterprise plan only. Must be an organization admin. |
| `org:developer_log_read` | Read organization [developer logs](developer-logs.md). Note: Enterprise plan with Governance+ only. Must be an organization admin. |
| `org:discovery_read` | Read [text event data](discovery.md) in the organization. Note: Enterprise plans with Governance+ only. Must be an organization admin. |
| `project_metadata:read` | Read metadata of projects. |
| `projects:read` | List projects and files in projects. |
| `selections:read` | Read most recent selection in files you can access. |
| `team_library_content:read` | Read published components and styles of teams. |
| `webhooks:read` | Read metadata of webhooks. |
| `webhooks:write` | Create and manage webhooks. |

note

**Note**: the `file_read` scope is deprecated for OAuth 2 tokens. Please migrate your application to use the scopes above.

## Figma MCP Server[​](#figma-mcp-server "Direct link to Figma MCP Server")

If you're looking to connect an AI coding tool to Figma rather than calling the REST API directly, you may want the [Figma MCP Server](../figma-mcp-server.md) instead. The MCP server handles its own OAuth authentication flow — you don't configure REST API scopes for it.

Access to the Figma MCP Server is limited to clients listed in the [Figma MCP Catalog](https://www.figma.com/mcp-catalog/). Developers interested in connecting a new MCP client can [join the waitlist](https://form.asana.com/?k=kBG-ejRQTdY8x_H6a4vM3Q&d=10497086658021).

[Previous

Personal access tokens](personal-access-tokens.md)[Next

Rate Limits](rate-limits.md)

- [Figma MCP Server](#figma-mcp-server)
