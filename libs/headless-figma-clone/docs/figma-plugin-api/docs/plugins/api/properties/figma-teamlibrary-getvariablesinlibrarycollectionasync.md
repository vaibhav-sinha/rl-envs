<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [teamLibrary](../figma-teamlibrary.md)
- getVariablesInLibraryCollectionAsync

On this page

Returns a descriptor of all [`Variable`](../Variable.md)s that exist in a given [`LibraryVariableCollection`](../LibraryVariableCollection.md).
Rejects if the given variable collection does not exist, or if the current user
does not have access to that variable collection's library, or if the request fails.

## Signature[​](#signature "Direct link to Signature")

### getVariablesInLibraryCollectionAsync(libraryCollectionKey: string): Promise<[LibraryVariable](../LibraryVariable.md)[]>

## Parameters[​](#parameters "Direct link to Parameters")

### libraryCollectionKey[​](#librarycollectionkey "Direct link to libraryCollectionKey")

the key of the library variable collection that contains the returned library variables.

## Example usage[​](#example-usage "Direct link to Example usage")

Example usage of getVariablesInLibraryCollectionAsync

```
// Query all published collections from libraries enabled for this file  
const libraryCollections =  
    await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()  
// Select a library variable collection to import into this file  
const variablesInFirstLibrary =  
    await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libraryCollections[0].key)  
// Import the first number variable we find in that collection  
const variableToImport =  
    variablesInFirstLibrary.find((libVar) => libVar.resolvedType === 'FLOAT')  
const importedVariable =  
    await figma.variables.importVariableByKeyAsync(variableToImport.key)
```

[Previous

getAvailableLibraryVariableCollectionsAsync](figma-teamlibrary-getavailablelibraryvariablecollectionsasync.md)[Next

annotations](../figma-annotations.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [libraryCollectionKey](#librarycollectionkey)
- [Example usage](#example-usage)
