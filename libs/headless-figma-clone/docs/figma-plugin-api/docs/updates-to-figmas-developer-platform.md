<!-- source: https://developers.figma.com/docs/updates-to-figmas-developer-platform -->

On this page

We’re making some changes to Figma’s developer platform to provide a more reliable and consistent experience for builders and users of our APIs. These include new requirements for publishing OAuth apps, and updated rate limits for the REST API which will go into effect on November 17, 2025. All existing apps will need to be re-published by November 17, 2025 to meet these requirements.

## Why we’re making these changes[​](#why-were-making-these-changes "Direct link to Why we’re making these changes")

Users and teams that depend on Figma’s APIs have expressed a greater need for structure and predictability. App builders have asked for clearer guidelines and documentation, while users want more visibility into usage limits and assurance that integrations meet Figma’s standards.

The new resources and requirements detailed below give developers a clear blueprint for building apps that users can trust. Our REST API rate limits will be adjusted later this year to create a more predictable experience for developers and users of their apps.

Together, these changes reinforce the foundation of our developer platform, which allows us to confidently build out the REST API to support more products and use cases and roll out [improvements to the Figma MCP server](https://www.figma.com/blog/design-context-everywhere-you-build/).

## What’s changing[​](#whats-changing "Direct link to What’s changing")

OAuth apps that use Figma’s REST API will now need to provide the following information and undergo review by the Figma team before they’re published. If your app was created before September 23, 2025, you will need to re-publish your app on the [My apps page](https://www.figma.com/developers/apps) by 11:59 pm PST on November 17, 2025.

- **App ownership** - Apps will need to designate a Figma team or organization as the app owner.
- **Scope declaration** - Apps will need to choose and explain which scopes they plan to use. Apps using the `file_read` and `files:read` scopes today will need to switch to new, granular scopes like `file_content:read` and `file_metadata:read` for more precise permissions.
- **App review and approval** - Apps that seek to be published publicly will need to be reviewed and approved by Figma’s team to ensure they meet [App review guidelines](https://help.figma.com/hc/en-us/articles/34963247780247). Apps that only seek to be published internally do not need to be reviewed by Figma. Later this year, all approved public apps that [opt in](https://help.figma.com/hc/en-us/articles/35074258201495) will be published to the Figma Community.
- **API rate limits** - Rate limits apply to all users. The rate limits vary depending on the API tier, as well as the user’s Figma plan (Starter, Professional, Organization, or Enterprise), and seat type (View, Collab, Dev, or Full). Personal access tokens will also be subject to the rate limits when they go into effect. You can reference our [rate limits documentation](rest-api/rate-limits.md) for a deeper explanation.

  caution

  **Note:** Figma reserves the right to change rate limits. Changes may affect specific endpoints, tiers, or plans.

## FAQ for app builders[​](#faq-for-app-builders "Direct link to FAQ for app builders")

### How do I re-publish my app?[​](#how-do-i-re-publish-my-app "Direct link to How do I re-publish my app?")

Re-publish existing apps from the [My apps page](https://figma.com/developers/apps) by selecting the app and completing the steps that follow. You will be prompted to choose an app owner, determine if the app is for public or private consumption, and select scopes. If you’re re-publishing a public app, you will need to provide testing instructions for Figma’s team to use to review your public app. You can [read more about the re-publishing process here](rest-api/republish-oauth-apps.md).

### What will the app review process look like?[​](#what-will-the-app-review-process-look-like "Direct link to What will the app review process look like?")

Figma will use the testing info you provide to check that everything works as expected and follows our [App review guidelines](https://help.figma.com/hc/en-us/articles/34963247780247), similar to what we do for public plugins and widgets. Our goal is to be thoughtful and reasonably prompt in our review. We’ll let you know over email if your app has been approved or needs changes.

### When should I use the REST API versus the Figma MCP server to build integrations?[​](#when-should-i-use-the-rest-api-versus-the-figma-mcp-server-to-build-integrations "Direct link to When should I use the REST API versus the Figma MCP server to build integrations?")

It depends. If you are building agentic software coordinated by models, the Figma MCP server will save you time and give your users a better experience. If you need direct access to specific APIs, use the REST API.

### When is the deadline for re-publishing my app?[​](#when-is-the-deadline-for-re-publishing-my-app "Direct link to When is the deadline for re-publishing my app?")

Apps must be re-published by 11:59 pm PT November 17, 2025.

### What happens if I don’t do anything?[​](#what-happens-if-i-dont-do-anything "Direct link to What happens if I don’t do anything?")

Public and private OAuth apps that haven’t been re-published by the deadline will move into a draft state and be unable to call Figma's REST APIs. We do not want this to happen, so please contact us using our [support form](https://help.figma.com/hc/en-us/requests/new) if for any reason you need help to hit the deadline.

### I have more questions—what’s the best way to reach you for help?[​](#i-have-more-questionswhats-the-best-way-to-reach-you-for-help "Direct link to I have more questions—what’s the best way to reach you for help?")

You can reach our developer platform team using our [support form](https://help.figma.com/hc/en-us/requests/new).

- [Why we’re making these changes](#why-were-making-these-changes)
- [What’s changing](#whats-changing)
- [FAQ for app builders](#faq-for-app-builders)
  - [How do I re-publish my app?](#how-do-i-re-publish-my-app)
  - [What will the app review process look like?](#what-will-the-app-review-process-look-like)
  - [When should I use the REST API versus the Figma MCP server to build integrations?](#when-should-i-use-the-rest-api-versus-the-figma-mcp-server-to-build-integrations)
  - [When is the deadline for re-publishing my app?](#when-is-the-deadline-for-re-publishing-my-app)
  - [What happens if I don’t do anything?](#what-happens-if-i-dont-do-anything)
  - [I have more questions—what’s the best way to reach you for help?](#i-have-more-questionswhats-the-best-way-to-reach-you-for-help)
