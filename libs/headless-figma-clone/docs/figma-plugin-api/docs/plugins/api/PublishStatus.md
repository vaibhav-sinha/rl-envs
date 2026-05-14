<!-- source: https://developers.figma.com/docs/plugins/api/PublishStatus -->

- Plugins
- [Data Types](data-types.md)
- PublishStatus

```
type PublishStatus = "UNPUBLISHED" | "CURRENT" | "CHANGED"
```

Describes the status of elements that could be published to the team library, namely styles and components.

The possible values are:

- `"UNPUBLISHED"`: the element is not published to the team library
- `"CURRENT"`: the element is published and the published version matches the local version
- `"CHANGED"`: the element is published, but has local changes

[Previous

Paint](Paint.md)[Next

Reaction](Reaction.md)
