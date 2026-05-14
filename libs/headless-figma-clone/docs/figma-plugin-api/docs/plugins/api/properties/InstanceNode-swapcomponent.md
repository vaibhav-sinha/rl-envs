<!-- source: https://developers.figma.com/docs/plugins/api/properties/InstanceNode-swapcomponent -->

- Plugins
- [Node Types](../nodes.md)
- [InstanceNode](../InstanceNode.md)
- swapComponent

On this page

Swaps this instance's current main component with `componentNode` and preserves overrides using the same heuristics as instance swap in the Figma editor UI. Note that we may update these override preservation heuristics from time to time.

Supported on:

- [InstanceNode](../InstanceNode.md)

## Signature[​](#signature "Direct link to Signature")

### [swapComponent](InstanceNode-swapcomponent.md)(componentNode: [ComponentNode](../ComponentNode.md)): void

## Remarks[​](#remarks "Direct link to Remarks")

Learn more about instance swap and override preservation in our [help center](https://help.figma.com/hc/en-us/articles/360039150413-Swap-between-component-instances-in-a-file). If you do not want to preserve overrides when swapping, you should assign to [`mainComponent`](../InstanceNode.md#maincomponent), which sets the instance's main component directly and clears all overrides.

[Previous

InstanceNode](../InstanceNode.md)[Next

scaleFactor](InstanceNode-scalefactor.md)

- [Signature](#signature)
- [Remarks](#remarks)
