<!-- source: https://developers.figma.com/docs/plugins/updates/2025/03/17/version-1-update-109 -->

We're making some changes to plugin data storage.

New:

- The total [client storage](../../../../api/figma-clientStorage.md) limit is now 5 MB, up from 1 MB previously
- [`setSharedPluginData`](../../../../api/properties/nodes-setplugindata.md) and [`setSharedPluginData`](../../../../api/properties/nodes-setsharedplugindata.md) have new per-entry 100 kB limits

Bug fixes:

- Fix the return type for [node.getRangeBoundVariable()](../../../../api/TextNode.md#getrangeboundvariable).

[Newer post

Updates for 2025-04-03](../../04/03/update.md)[Older post

Updates for 2025-03-12](../12/update.md)
