<!-- source: https://developers.figma.com/docs/rest-api/payments -->

- REST API
- Payments
- Getting started

On this page

## Getting started[​](#getting-started "Direct link to Getting started")

The Payments REST API allows you to securely validate purchases on the Figma platform from a server. This API builds off of the [Plugin Payments API](../plugins/requiring-payment.md) and allows you to restrict parts of your website or service to just those who have purchased your plugin, widget, or Community file.

This unlocks a couple of use cases for creators:

- Creators of plugins and widgets can **protect potentially expensive endpoints** behind payment verification. For example, you can only allow users who have paid for your plugin to use the part of a copy-assistance plugin that makes expensive requests to a generative AI model.
- Creators are able to **gate valuable parts of their website** behind payment verification. For example, only allowing users that have purchased a Community file to access documentation and tutorials on your external website.

The Payments REST API does not support OAuth 2. In order to use the Payments REST API, you'll need to authenticate your requests using a personal access token. You can follow our [access token guide](authentication.md#access-tokens) to learn how to generate and use your own personal access token. *Note that plugin payment tokens are not a replacement for personal access tokens.*

[Next

Types](payments-types.md)

- [Getting started](#getting-started)
