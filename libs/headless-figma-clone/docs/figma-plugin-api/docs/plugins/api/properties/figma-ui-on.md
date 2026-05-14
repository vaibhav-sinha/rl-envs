<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-ui-on -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [ui](../figma-ui.md)
- on

On this page

Register a handler for incoming messages from the UI's `<iframe>` window.

## Signature[​](#signature "Direct link to Signature")

### [on](figma-ui-on.md)(type: 'message', callback: [MessageEventHandler](figma-ui-onmessage.md#message-event-handler)): void

## Remarks[​](#remarks "Direct link to Remarks")

The `pluginMessage` argument contains the message passed by the call to `postMessage` on the UI side.

The `props` argument contains a `origin` property contains the origin of the document that sent the message. It is an advanced feature, mainly used for implementing OAuth.

[Previous

onmessage](figma-ui-onmessage.md)[Next

util](../figma-util.md)

- [Signature](#signature)
- [Remarks](#remarks)
