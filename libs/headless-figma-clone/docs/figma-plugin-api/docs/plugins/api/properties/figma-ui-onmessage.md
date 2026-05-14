<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-ui-onmessage -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [ui](../figma-ui.md)
- onmessage

On this page

Register a handler for incoming messages from the UI's `<iframe>` window.

## Signature[​](#signature "Direct link to Signature")

### [onmessage](figma-ui-onmessage.md): [MessageEventHandler](figma-ui-onmessage.md#message-event-handler) | undefined

## Remarks[​](#remarks "Direct link to Remarks")

The `pluginMessage` argument contains the message passed by the call to `postMessage` on the UI side.

The `props` argument contains a `origin` property contains the origin of the document that sent the message. It is an advanced feature, mainly used for implementing OAuth.

[Previous

postMessage](figma-ui-postmessage.md)[Next

on](figma-ui-on.md)

- [Signature](#signature)
- [Remarks](#remarks)
