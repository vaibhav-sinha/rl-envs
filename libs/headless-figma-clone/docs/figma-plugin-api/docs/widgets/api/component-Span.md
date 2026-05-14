<!-- source: https://developers.figma.com/docs/widgets/api/component-Span -->

- Widgets
- Component Types
- Span

On this page

`Span` components are used to style ranges of characters inside of a `Text` component. `Span` components support
all of the text styling properties that exist on the `Text` component.
The `Span` component can **only** be a child of a `Text` component or another `Span` component.

## Usage Example[​](#usage-example "Direct link to Usage Example")

Usage example

```
<Text  
  fill="#0F0"  
  fontSize={20}  
  fontFamily="Roboto"  
  fontWeight={400}  
  textCase="upper"  
  textDecoration="underline"  
>  
  Hello{' '}  
  <Span  
    fontSize={50}  
    fontFamily="Poppins"  
    fontWeight={800}  
    textCase="original"  
    textDecoration="none"  
  >  
    Worl  
    <Span fontSize={30} fill="#F00" italic>  
      d  
    </Span>  
  </Span>  
</Text>
```

This will result in text that looks like this:

![](https://static.figma.com/uploads/68f1a863b59cbf4fedbb32d721ae65240a17dece)

## Text Style Props[​](#text-style-props "Direct link to Text Style Props")

### href?: string

If specified, turns the text node into a link that navigates to the specified `href` on click.

---

### fontFamily?: string

The font family (e.g. "Inter"). The supported fonts are all the fonts in the [Google Fonts](https://fonts.google.com/) library.

---

### letterSpacing?: number | string

The spacing between the individual characters.

---

### textDecoration?: 'none' | 'strikethrough' | 'underline'

Whether the text is underlined or has a strikethrough.

---

### fontSize?: number

The size of the font. Has minimum value of 1.

---

### italic?: boolean

Whether or not to italicize the text content.

---

### textCase?: 'upper' | 'lower' | 'title' | 'original' | 'small-caps' | 'small-caps-forced'

Overrides the case of the raw characters in the text node.

---

### fontWeight?: [FontWeight](type-FontWeight.md#font-weight)

The font weight eg. 400, 500 or 'medium', 'bold'.

---

### fill?: HexCode | [Color](type-Color.md#color) | [Paint](type-Paint.md#paint) | ([SolidPaint](type-SolidPaint.md#solid-paint) | [GradientPaint](type-GradientPaint.md#gradient-paint))[]

The paints used to fill in the text.

---

## Default Props[​](#default-props "Direct link to Default Props")

The `Span` component has no default properties and instead inherits its properties from the parent component. So in the example below the `Span` would inherit the `fontSize` of 20 from its parent, but have a fill color of `#F00` while its parent has a fill of `#000`.

```
<Text fontSize={20} fill="#000">  
  Widgets <Span fill="#F00">are fun</Span>  
</Text>
```

[Previous

Text](component-Text.md)[Next

Input](component-Input.md)

- [Usage Example](#usage-example)
- [Text Style Props](#text-style-props)
- [Default Props](#default-props)
