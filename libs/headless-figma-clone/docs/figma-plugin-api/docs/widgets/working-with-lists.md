<!-- source: https://developers.figma.com/docs/widgets/working-with-lists -->

- Widgets
- Development Guides
- Working with Lists

In some cases, you might want to render a list of values. For example, you might have a list of user photo urls that you want to render.

A common pattern to achieve this in JSX is to use a map as follows:

Rendering a list with map()

```
const { widget } = figma  
const { AutoLayout, Image } = widget  
  
const userPhotoUrls = [  
  "https://....",  
  "https://....",  
  "https://....",  
]  
  
function ListExample() {  
  return (  
    <AutoLayout>  
      {userPhotoUrls.map(url => {  
        return <Image key={url} src={url} />  
      })}  
    </AutoLayout>  
  )  
}  
  
widget.register(ListExample);
```

You might notice that we’ve also specified a `key` prop on each image! This works very much in the same way as the [key prop in React](https://reactjs.org/docs/lists-and-keys.html#keys) and it used as a hint to help us identify which items have changed/ been added/removed across re-renders to improve the performance of re-rendering these items!

caution

⚠️ We’ll warn against missing key props in the console whenever we detect lists of children without specified keys. You can fix these warnings by giving each element inside an array a key!

[Previous

Text Editing](text-editing.md)[Next

Working with Variables](working-with-variables.md)
