<!-- source: https://developers.figma.com/docs/rest-api/webhooks-security -->

- REST API
- Webhooks
- Security

warning

**Important:** When creating a webhook you are required to pass in a `passcode`. The purpose of the `passcode` field is so that your application can verify that Figma is actually what is calling your endpoint (as opposed to some attacker trying to make you believe something about your users' Figma files).

For security purposes, when requesting webhooks using [GET webhook by id](webhooks-endpoints.md#webhooks-v2-get-by-id-endpoint) or [GET webhooks](webhooks-endpoints.md#webhooks-v2-get-endpoint), the `passcode` is redacted and an empty string is returned. This is to ensure that `passcode` is only exposed by events that we send you.

We recommend comparing the `passcode` we pass back to you in events with the `passcode` originally provided when creating the endpoint to make sure they match before acting on the webhook trigger. If you receive a request with the wrong `passcode`, you should respond with a `400 Bad Request` HTTP response which will immediately stop the webhook.

[Previous

Endpoints](webhooks-endpoints.md)
