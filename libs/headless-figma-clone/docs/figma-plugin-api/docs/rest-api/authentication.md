<!-- source: https://developers.figma.com/docs/rest-api/authentication -->

- REST API
- Authentication
- Authentication

On this page

When you make requests to endpoints in the Figma REST API, you must authenticate the requests you are sending. You can authenticate requests to the Figma REST API in three ways:

- **Recommended:** Create an [OAuth app](oauth-apps.md) to use OAuth 2, which lets you make requests with access tokens that you obtain on behalf of the users of your app. The advantage of an OAuth app is that you can make requests on behalf of other users, and the requests themselves aren’t made using your personal Figma account. Additionally, if for some reason you leave a company or team, OAuth apps are able to be reassigned by team or organization admins.

  Some parts of the REST API, such as the Activity Logs API and Discovery API, require you to use an OAuth app for authentication.

  note

  **Note:** If you’re working with the [Embed API](../embeds/embed-api.md), you’ll also need to create an OAuth app even if you won’t be authenticating users.
- Generate a [plan access token](plan-access-tokens.md) for your organization or enterprise. Unlike OAuth and personal access tokens, a plan access token isn't tied to a specific user account in Figma. They're useful for needs like CI/CD implementations, logging, creating user-agnostic webhooks, and other tasks that you normally wouldn't want gated by a single individual in your organization. Because plan access tokens are managed by organization administrators, it also makes token governance more scalable.

  note

  **Note:** Plan access tokens are currently in beta, which means they are governed by Figma's [Beta Terms](https://www.figma.com/product-specific-terms/).

  Plan access tokens are available for Organization and Enterprise plans.
- Generate a [personal access token](personal-access-tokens.md) for your Figma account. A personal access token allows you to make REST API requests using your personal Figma account.

For OAuth apps and tokens, you’ll specify what [scopes](scopes.md) you want to permit. Scopes define what resources the OAuth 2 access token or personal access token. For example, to read the content of files, you would grant the `file_content:read` scope to the OAuth app or personal access token.

## What type of authentication should I use?[​](#what-type-of-authentication-should-i-use "Direct link to What type of authentication should I use?")

Use an **OAuth app** if your application needs to act on behalf of individual Figma users, and for the Embed API.

Use a **plan access token** for organization-level automation like CI/CD pipelines, logging, and other tasks that shouldn't be tied to a specific user.

Use a **personal access token** for individual use, such as scripts or local tooling against your own Figma account.

## OAuth apps[​](#oauth-apps "Direct link to OAuth apps")

An OAuth app is used to implement authenticated access from your existing application to the Figma REST API. In this context, “existing application” can mean a lot of things. For example:

- A script or internal tool you use in your organization
- A platform or app that serves users of Figma
- Automation for developer systems

…and any other software interface that you want to use to access the Figma REST API.

An OAuth app enables you to use OAuth 2 for authentication. [OAuth 2](https://oauth.net/2/) is a web security protocol that allows 3rd party applications to establish a link between a user’s account and their access to a given API, on behalf of that user.

To learn more, see [OAuth apps](oauth-apps.md).

## Plan access tokens[​](#plan-access-tokens "Direct link to Plan access tokens")

A plan access token provides API access scoped to an organization or enterprise plan. They are managed by plan administrators, can be restricted to specific resources with an allowlist, and support expiration periods of up to 1 year. Plan access tokens are available for any Organization or Enterprise plan.

To learn more, see [Plan access tokens](plan-access-tokens.md).

## Personal access tokens[​](#access-tokens "Direct link to Personal access tokens")

A personal access token gives the holder access to an account through the API as if they were the user who generated the token.

To learn more, see [Personal access tokens](personal-access-tokens.md).

[Previous

Introduction](../rest-api.md)[Next

OAuth apps](oauth-apps.md)

- [What type of authentication should I use?](#what-type-of-authentication-should-i-use)
- [OAuth apps](#oauth-apps)
- [Plan access tokens](#plan-access-tokens)
- [Personal access tokens](#access-tokens)
