<!-- source: https://developers.figma.com/docs/widgets/images-in-widgets -->

- Widgets
- Development Guides
- Images in Widgets

You can render Images as part of a widget using the `<Image>` component or by using the `fill` property on `<Frame>` and `<Rectangle>` elements.

Here is an example

Render images

```
const { widget } = figma  
const { Image, Frame, AutoLayout } = widget  
  
function ImageExamples() {  
  return (  
    <AutoLayout>  
      <Image  
        // Pass a data uri directly as the image  
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAECSURBVHgBpY87TwJBFIXPnVkhbqQQE7UQNWhrsdpLI40FsdSYGGNvbWFhZ2Jj+AWER0fFD6CAhhYCod8GGmCLJRAI2Rl22LDh1RBOc1/fzb0H2EK0WPSfzj+lxG3wMIpAOKpaZfpPpddgKxG510BllSsw6MGAEAYl0zWVMn+L8boEzOXD0oRwrI1vZF9ESRetWO94XMjEDwxb0xttTF6txyNbzbU5mHmWhhtiQ3aGSkQmTH129YJLunJjdQned9DshkbF8d7o4cRiOSB0475ld+JUnTM+/Pb1d0p8ck2eKXN49/OOFfkGOXfCLnjpdamNDfLhgfFdIyE+GOg3AJHHrpoC5YtKfAfixH0AAAAASUVORK5CYII="  
  
        width={100}  
        height={100}  
      />  
      <Frame  
        fill={{  
          type: 'image',  
          src: figma.currentUser.photoUrl  
        }}  
  
        width={100}  
        height={100}  
      />  
    </AutoLayout>  
  )  
}  
  
widget.register(ImageExamples)
```

[Previous

Working with Variables](working-with-variables.md)[Next

Managing Multiple Widgets](managing-multiple-widgets.md)
