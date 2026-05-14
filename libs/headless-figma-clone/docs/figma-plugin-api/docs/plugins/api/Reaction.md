<!-- source: https://developers.figma.com/docs/plugins/api/Reaction -->

- Plugins
- [Data Types](data-types.md)
- Reaction

```
type Reaction = { action?: Action, actions?: Action[], trigger: Trigger | null }
```

A prototyping `Reaction` describes interactivity in prototypes. It contains a list of [`Action`](Action.md) objects ("what happens?") and a [`Trigger`](Trigger.md) ("how do you make it happen?").

> Note: The `action` field is now deprecated and replaced by the `actions` field in order to allow for multiple `Actions` on a `Reaction`.

info

When setting reactions, each `Reaction` must contain both a `Trigger` and a non-empty list of `Action` objects.

[Previous

PublishStatus](PublishStatus.md)[Next

Rect](Rect.md)
