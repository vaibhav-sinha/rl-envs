<!-- source: https://developers.figma.com/docs/embeds/embed-kit-2.0 -->

- Embeds
- Embed Kit 2.0

On this page

In 2024, Figma released Embed Kit 2.0. Embed Kit 2.0 provides enhanced security features and gives you more control and flexibility over how you want to bring live Figma designs, FigJam boards, and prototypes into your own websites or apps.

## Enhanced security[​](#enhanced-security "Direct link to Enhanced security")

To stay up to date with evolving web technology requirements, Embed Kit 2.0 introduces the use of the Storage Access API when third-party cookies are inaccessible due to browser changes like [Intelligent Tracking Prevention](https://webkit.org/blog/9521/intelligent-tracking-prevention-2-3/) and [Privacy Sandbox](https://privacysandbox.com/). This ensures that embeds remain protected by user authentication while also benefiting from the latest security features defined by [Web Standards](https://www.w3.org/standards/), such as ensuring embeds exist in a secure context.

For embedded prototypes, Embed Kit 2.0 requires you to register your allowed embed origins with your OAuth app and provide the client ID. This ensures that embedded prototypes only accept messages from and emit events to domains that you control, as Figma will only send to and receive from the origins specified for your OAuth app.

## More control and flexibility[​](#more-control-and-flexibility "Direct link to More control and flexibility")

Previously, embeds had some limited functionality around what kind of viewer experience you wanted to provide (for example, no control over theme). Embed Kit 2.0 offers substantial improvements:

- Send and receive events from a Figma prototype embed, so your site can control the prototype or react to a user's actions in the prototype.
- Allow users to select which page to view in an embedded Figma file.
- Hide all embed UI, except the Figma logo, to make embeds feel like a native part of your site or app.
- Lock the view of the embed to a particular page or a particular frame or slide.
- Set the embed to always open a file in Dev Mode or Figma Design.
- Use a light or dark theme, or match the user's system's theme.

Embed Kit 2.0 also introduces a new URL structure to make it easier to differentiate the types of embedded files:

```
embed.figma.com/board (FigJam boards)  
embed.figma.com/slides (Figma Slides files)  
embed.figma.com/deck (Figma Slides files in presentation view)  
embed.figma.com/design (Figma files)  
embed.figma.com/proto (Figma prototypes)
```

## Am I using Embed Kit 2.0?[​](#am-i-using-embed-kit-20 "Direct link to Am I using Embed Kit 2.0?")

It's easiest to identify if you're using Embed Kit 2.0 or Embed Kit 1.0 by looking at the URL format.

Embed Kit 2.0 URL format: `embed.figma.com`

Embed Kit 1.0 URL format: `figma.com/embed`

If you see `embed.figma.com` in the URL of your embed, you're using Embed Kit 2.0.

## Support for Embed Kit 1.0[​](#support-for-embed-kit-10 "Direct link to Support for Embed Kit 1.0")

Files embedded with Embed Kit 1.0 will be supported indefinitely. You don't need to update unless you want to take advantage of the new features or you use the Embed API to communicate with an embedded prototype.

warning

**Note:** While files will continue to work, support for using the Embed API with Embed Kit 1.0 has ended. To continue using the Embed API to control your embedded prototypes or get user-triggered events, you must migrate your embedded prototypes to Embed Kit 2.0, and follow the steps to [get started with the Embed API](embed-api.md#get-started-with-embed-api).

[Previous

Overview](../embeds.md)[Next

Security and access](security-access.md)

- [Enhanced security](#enhanced-security)
- [More control and flexibility](#more-control-and-flexibility)
- [Am I using Embed Kit 2.0?](#am-i-using-embed-kit-20)
- [Support for Embed Kit 1.0](#support-for-embed-kit-10)
