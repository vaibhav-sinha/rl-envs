<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-teamlibrary-getavailablelibraryvariablecollectionsasync -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [teamLibrary](../figma-teamlibrary.md)
- getAvailableLibraryVariableCollectionsAsync

On this page

Returns a descriptor of all [`VariableCollection`](../VariableCollection.md)s that exist in the enabled libraries of the current file. Rejects if the request fails.

info

This requires that users enable libraries that contain variables via the UI. Currently it is not possible to enable libraries via the Plugin API.

## Signature[​](#signature "Direct link to Signature")

### [getAvailableLibraryVariableCollectionsAsync](figma-teamlibrary-getavailablelibraryvariablecollectionsasync.md)(): Promise<[LibraryVariableCollection](../LibraryVariableCollection.md)[]>

## Remarks[​](#remarks "Direct link to Remarks")

This is intended to be used in conjunction with [`getVariablesInLibraryCollectionAsync`](figma-teamlibrary-getvariablesinlibrarycollectionasync.md)

[Previous

teamLibrary](../figma-teamlibrary.md)[Next

getVariablesInLibraryCollectionAsync](figma-teamlibrary-getvariablesinlibrarycollectionasync.md)

- [Signature](#signature)
- [Remarks](#remarks)
