<!-- source: https://developers.figma.com/docs/plugins/api/BuzzTextField -->

- Plugins
- [Data Types](data-types.md)
- BuzzTextField

On this page

```
interface BuzzTextField {  
  readonly value: string | null  
  readonly node: TextNode | null  
  setValueAsync(value: string): Promise<void>  
}
```

Represents a text field within a Buzz media asset that can be dynamically updated. BuzzTextField objects are returned by [`getTextContent`](properties/figma-buzz-gettextcontent.md) and provide access to both the current text content and the underlying text node.

**Properties:**

- `value` - The current text content of the field, or `null` if the field is empty
- `node` - The underlying [`TextNode`](TextNode.md) that contains this text content, or `null` if not found

**Methods:**

- `setValueAsync(value)` - Updates the text content asynchronously. This method handles the underlying text node updates and maintains formatting where possible.

## Usage Example[​](#usage-example "Direct link to Usage Example")

```
// Get all text fields from a Buzz asset  
const textFields = figma.buzz.getTextContent(selectedNode);  
  
// Update text content  
for (const field of textFields) {  
  await field.setValueAsync('Hello');  
}  
  
// Check if text field is empty  
if (field.value === null) {  
  await field.setValueAsync('Default content');  
}
```

BuzzTextField is particularly useful for creating dynamic media templates where text content needs to be updated programmatically based on user input or data sources.

[Previous

BuzzMediaField](BuzzMediaField.md)[Next

CanvasViewChangeEvent](CanvasViewChangeEvent.md)

- [Usage Example](#usage-example)
