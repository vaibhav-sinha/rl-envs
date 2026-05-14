<!-- source: https://developers.figma.com/docs/embeds/security-access -->

- Embeds
- Security and access

Embedded Figma files and prototypes respect the [sharing settings](https://help.figma.com/hc/articles/360040531773-Share-files-and-prototypes#h_01HWXCEXD6J4A58S3RAGJ8FTKB) of the file.

- If the file is password protected, the viewer is prompted for the password.
- If the file is shared within an organization, the viewer needs to log in to access the file.
- If the file isn't explicitly shared with the viewer, or the file is shared publicly, access to the file is based on the file's [link sharing settings](https://help.figma.com/hc/articles/360040531773-Share-files-and-prototypes#h_01HWXCEXD6J4A58S3RAGJ8FTKB).

This ensures that the viewer has permission to access the file before the embed loads and renders.

Because embeds use iframes, embeds also benefit from the security features in browsers, such as enforcement of [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy).

[Previous

Embed Kit 2.0](embed-kit-2.0.md)[Next

Embed a Figma file](embed-figma-file.md)
