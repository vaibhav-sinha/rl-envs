<!-- source: https://developers.figma.com/docs/embeds/troubleshooting -->

- Embeds
- Troubleshooting

On this page

## Troubleshooting[​](#troubleshooting "Direct link to Troubleshooting")

On rare occasion, viewers may have issues viewing embeds. Generally, this is related to whether the viewer has previously interacted with Figma, and whether they've correctly permitted embedded content and access to the browser's Storage Access API.

### Allow embedded content[​](#allow-embedded-content "Direct link to Allow embedded content")

If a viewer has blocked or denied access to embedded content on a page, your embedded file or prototype won't be able to load. To solve this issue, the viewer must allow embedded content. The exact steps depend on the browser you're using.

- For Chrome, see Chrome's guide to [embedded content](https://support.google.com/chrome/answer/95647?sjid=1917231227448865868-NC#embedded_content&zippy=%2Cabout-embedded-content) and [changing site settings](https://support.google.com/chrome/answer/114662?sjid=1917231227448865868-NC#).

### The Storage Access API is blocked[​](#the-storage-access-api-is-blocked "Direct link to The Storage Access API is blocked")

Figma embeds require the Storage Access API. If a viewer has blocked Figma's access to the Storage Access API, or the browser has automatically blocked access, then the viewer needs to fix their browser settings to permit access to the Storage Access API. The exact steps depend on the browser you're using.

- For Chrome, the steps are the same as allowing embedded content. See Chrome's guide to [embedded content](https://support.google.com/chrome/answer/95647?sjid=1917231227448865868-NC#embedded_content&zippy=%2Cabout-embedded-content) and [changing site settings](https://support.google.com/chrome/answer/114662?sjid=1917231227448865868-NC#).
- For Firefox, see the [site storage settings](https://support.mozilla.org/en-US/kb/storage#w_allow-or-block-websites-from-storing-information) and ensure that Figma isn't blocked.

[Previous

Resources](resources.md)

- [Troubleshooting](#troubleshooting)
  - [Allow embedded content](#allow-embedded-content)
  - [The Storage Access API is blocked](#the-storage-access-api-is-blocked)
