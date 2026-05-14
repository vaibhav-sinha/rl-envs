<!-- source: https://developers.figma.com/docs/rest-api/plan-access-tokens -->

- REST API
- Authentication
- Plan access tokens

On this page

A plan access token provides API access scoped to an organization or enterprise plan. Unlike personal access tokens and OAuth apps, plan access tokens are not tied to an individual user account. They are managed by plan administrators.

Plan access tokens are available for Organization and Enterprise plans.

note

**Note:** Plan access tokens are currently in beta, which means they are governed by Figma's [Beta Terms](https://www.figma.com/product-specific-terms/).

## When to use plan access tokens[​](#when-to-use-plan-access-tokens "Direct link to When to use plan access tokens")

Personal access tokens and OAuth apps each have limitations for organization-level automation:

| **Personal access token** | **OAuth app** |
| --- | --- |
| Tied to an individual user | Designed for interactive workflows, not automation |
| Does not follow [least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege); can access anything the user can | Requires user authentication flows and token management/refresh |
| Max expiration of 90 days | Complex to set up for internal automation use cases |
| No way to guarantee full-organization visibility unless an admin generates the token |  |

**Plan access tokens** address these limitations:

- Tied to a plan, not an individual user
- Limited to resources in the plan
- Can be further limited with a resource allowlist
- Managed by plan administrators
- Max expiration of 1 year
- Better token rotation support

## Supported endpoints[​](#supported-endpoints "Direct link to Supported endpoints")

Plan access tokens can be used with any REST API endpoint, with the following exceptions:

- Endpoints that require the `file_code_connect:write` scope
- Endpoints that require the `file_variables:write` scope
- Endpoints that require the `file_comments:write` scope
- The `/v1/me` endpoint
- The `/v1/oembed` endpoint

## Create a plan access token[​](#create-a-plan-access-token "Direct link to Create a plan access token")

Organization administrators can create plan access tokens on the developer hub at [figma.com/developers/tokens](https://www.figma.com/developers/tokens):

note

Creating a plan access token requires multi-factor authentication. Unless your organization has **Members must log in with SSO** [authentication method](https://help.figma.com/hc/en-us/articles/360052497994-Set-login-and-authentication-method#h_01HKBBTSB0PZJ96CNZA5C8VX5V) enabled, the administrator creating the token must set up [Figma 2FA](https://help.figma.com/hc/en-us/articles/360039817634-Enable-two-factor-authentication-2FA) before they can generate a token.

1. Go to <https://www.figma.com/developers/tokens>

   The page contains a table of plan access tokens for your organization. Optionally:

   - You can use the tabs in the upper-left corner of the page to switch between **REST API** and **npm registry**. By default, the **REST API** tab is selected.
   - You can use the dropdown menu in the upper-right corner of the page to switch organizations.
2. In the upper-right corner of the table, click **Generate REST API token**.

   When you click the button, the **Generate REST API plan access token** modal opens. The modal has three pages: **Describe your token**, **Choose scopes**, and **Choose resources**.
3. On the **Describe your token** page of the modal:

   1. Enter a name for your token.
   2. Enter a description for your token.
   3. Select the expiration period (up to 365 days).
   4. Click **Next**.
4. On the **Choose scopes** page of the modal, [select the scopes](scopes.md) you want for your plan access token. Then, click **Next**.
5. On the **Choose resources** page of the modal, select what resources you want your plan access token to be able to access. There are two options:

   - **All resources** means your plan access token can be used to make requests for any resource in your organization. If you select the **All resources** option, the scopes you selected in step 4 still determine what actions can be taken with those resources.
   - **Only selected resources** lets you provide a list of links to resources in your organization, including files, projects, teams, and workspaces. For example:

     ```
     https://figma.com/design/ABCDEFG123,  
     https://figma.com/files/123456789/project/123,  
     https://figma.com/files/123456789/team/456,  
     https://figma.com/files/123456789/workspace/789
     ```
6. Click **Create**.

When you click create, your plan access token appears in a new box. Click **Copy** to copy the plan access token to your clipboard.

important

**Important:** You should immediately store the plan access token in a secure location, such as a password vault or a secrets management tool. This is the only time your token secret is displayed.

## Edit a plan access token[​](#edit-a-plan-access-token "Direct link to Edit a plan access token")

You can modify certain values for plan access tokens after you've created them, including:

- Name
- Description
- Scopes
- What resources the token can be used to access

You can also view and copy the id of your plan access token. However, you can't access the token secret again. The secret is only visible when you first create the plan access token.

To edit a plan access token:

1. Go to <https://www.figma.com/developers/tokens>
2. In the table, hover over the row for the plan access you want to edit.
3. At the end of the row, click *...*, and then **Edit token**.

   The edit modal for your plan access token appears. You can use the modal to change the values mentioned earlier in this section.

## Refresh a plan access token[​](#refresh-a-plan-access-token "Direct link to Refresh a plan access token")

You can refresh a plan access token as long as it is active and has not been revoked or expired. This applies to all token types (REST API and npm).

To refresh a plan access token:

1. Go to <https://www.figma.com/developers/tokens>
2. In the table, hover over the row for the plan access you want to edit.
3. At the end of the row, click *...*, and then **Refresh token**.
4. Review the new expiration date. The expiration is calculated from the current date, extended by the original token lifetime (for example, 30 days or 90 days). The previous secret continues to work for 24 hours.
5. Click **Refresh token**. The new token secret is generated and available to copy.

## Revoke a plan access token[​](#revoke-a-plan-access-token "Direct link to Revoke a plan access token")

While your plan access token will expire automatically after a given amount of time, there may be times you want to revoke a plan access token early.

To revoke a plan access token:

1. Go to <https://www.figma.com/developers/tokens>
2. In the table, hover over the row for the plan access you want to edit.
3. At the end of the row, click *...*, and then **Revoke token**.

   The plan access token is immediately revoked. This action cannot be undone. To replace the plan access token, you'll need to create a new one with the same scopes and resource access.

[Previous

OAuth apps](oauth-apps.md)[Next

Personal access tokens](personal-access-tokens.md)

- [When to use plan access tokens](#when-to-use-plan-access-tokens)
- [Supported endpoints](#supported-endpoints)
- [Create a plan access token](#create-a-plan-access-token)
- [Edit a plan access token](#edit-a-plan-access-token)
- [Refresh a plan access token](#refresh-a-plan-access-token)
- [Revoke a plan access token](#revoke-a-plan-access-token)
