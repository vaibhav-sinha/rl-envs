<!-- source: https://developers.figma.com/docs/plugins/updates/2025/07/17/version-1-update-116 -->

- Added the `visible` property to the [Noise](../../../../api/Effect.md#noiseeffect) and [Texture](../../../../api/Effect.md#textureeffect) effect types.
- Added the `boundVariables` property to [Noise](../../../../api/Effect.md#noiseeffect) and [Texture](../../../../api/Effect.md#textureeffect) effect types to prevent validation errors on write. Note that binding variables for Noise and Texture effects is not yet supported.
- Added a new [Glass](../../../../api/Effect.md#glasseffect) effect type in beta. Note that the effect is only supported on Frames at this time, and binding variables is not yet supported.
- Fixed [`GridTrackSize`](../../../../api/GridTrackSize.md) to properly handle `value` as optional.

[Newer post

Version 1, Update 117](../../08/13/version-1-update-117.md)[Older post

Version 1, Update 115](../08/version-1-update-115.md)
