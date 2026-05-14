<!-- source: https://developers.figma.com/docs/plugins/api/Image -->

- Plugins
- [Data Types](data-types.md)
- Image

On this page

This object is handle to an image stored in Figma.

A common misconception is that Figma has image layers. What we have instead is image fills [`ImagePaint`](Paint.md). In fact, dragging an image into Figma creates a rectangle with an image fill. This allows assigning images as strokes too, but it means that creating an image *on the canvas* requires creating a rectangle (or other shape), following by adding an image fill to it.

New images can be created via [`figma.createImage`](properties/figma-createimage.md) from a `Uint8Array` containing the bytes of the image file. Existing images can be read via [`figma.getImageByHash`](figma.md#getimagebyhash).

Figma supports PNG, JPEG, and GIF. Images can be up to 4096 pixels (4K) in width and height.

See this [example of working with images](../working-with-images.md).

## Image[​](#image "Direct link to Image")

### hash: string [readonly]

A unique hash of the contents of the image file.

---

### getBytesAsync(): Promise<Uint8Array>

The contents of the corresponding image file. This returns a promise because the image may still need to be downloaded (images in Figma are loaded separately from the rest of the document).

---

### getSizeAsync(): Promise<{ width: number; height: number }>

The width and height of the image in pixels. This returns a promise because the image may still need to be downloaded (images in Figma are loaded separately from the rest of the document).

---

[Previous

HyperlinkTarget](HyperlinkTarget.md)[Next

InferredAutoLayoutResult](InferredAutoLayoutResult.md)

- [Image](#image)
