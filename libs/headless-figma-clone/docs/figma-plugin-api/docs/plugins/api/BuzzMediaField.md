<!-- source: https://developers.figma.com/docs/plugins/api/BuzzMediaField -->

- Plugins
- [Data Types](data-types.md)
- BuzzMediaField

On this page

```
interface BuzzMediaField {  
  readonly type: 'IMAGE' | 'VIDEO' | null  
  readonly hash: string | null  
  readonly node: SceneNode | null  
  setMediaAsync(paint: ImagePaint | VideoPaint): Promise<void>  
}
```

Represents a media field within a Buzz media asset that can contain images or videos. BuzzMediaField objects are returned by [`getMediaContent`](properties/figma-buzz-getmediacontent.md) and provide access to the current media content and the ability to update it dynamically.

**Properties:**

- `type` - The type of media content: `'IMAGE'` for images, `'VIDEO'` for videos, or `null` if no media is present
- `hash` - A unique identifier for the current media content, or `null` if no media is set
- `node` - The underlying [`SceneNode`](nodes.md) that contains this media content, or `null` if not found

**Methods:**

- `setMediaAsync(paint)` - Updates the media content with a new [`ImagePaint`](Paint.md) or [`VideoPaint`](Paint.md). This method handles the underlying node updates and maintains aspect ratios where appropriate.

## Usage Example[​](#usage-example "Direct link to Usage Example")

```
// Get all media fields from a Buzz asset  
const mediaFields = figma.buzz.getMediaContent(selectedNode);  
  
// Update image content  
for (const field of mediaFields) {  
  if (field.type === 'IMAGE') {  
    // Create new image paint  
    const imageHash = figma.createImage(imageData).hash;  
    const imagePaint: ImagePaint = {  
      type: 'IMAGE',  
      imageHash,  
      scaleMode: 'FILL'  
    };  
  
    await field.setMediaAsync(imagePaint);  
  }  
}  
  
// Check for video content  
const videoFields = mediaFields.filter(field => field.type === 'VIDEO');  
console.log(`Found ${videoFields.length} video fields`);
```

BuzzMediaField is essential for creating dynamic media templates where images or videos need to be swapped out programmatically, such as for personalized content generation or automated social media posting workflows.

[Previous

BuzzAssetType](BuzzAssetType.md)[Next

BuzzTextField](BuzzTextField.md)

- [Usage Example](#usage-example)
