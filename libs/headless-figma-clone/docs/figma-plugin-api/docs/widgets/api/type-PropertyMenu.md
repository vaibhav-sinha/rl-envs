<!-- source: https://developers.figma.com/docs/widgets/api/type-PropertyMenu -->

- Widgets
- Data Types
- PropertyMenu

On this page

## `WidgetPropertyMenuItem`[​](#widgetpropertymenuitem "Direct link to widgetpropertymenuitem")

```
type WidgetPropertyMenuItem =  
  | WidgetPropertyMenuActionItem  
  | WidgetPropertyMenuSeparatorItem  
  | WidgetPropertyMenuColorItem  
  | WidgetPropertyMenuDropdownItem  
  | WidgetPropertyMenuToggleItem  
  | WidgetPropertyMenuLinkItem  
  
type WidgetPropertyMenu = WidgetPropertyMenuItem[]
```

## `WidgetPropertyMenuActionItem`[​](#widgetpropertymenuactionitem "Direct link to widgetpropertymenuactionitem")

The action item provides a simple action button in the property menu. When selected, the property menu callback will be called with the corresponding `propertyName` of the item.

![PropertyMenuActionExample](https://static.figma.com/uploads/d933305fa46c2b470971835cb4700c83de1e3cd3)

```
interface WidgetPropertyMenuActionItem {  
  itemType: 'action'  
  tooltip: string  
  propertyName: string  
  icon?: string  
}
```

### itemType: 'action'

Specifies the action item type.

---

### tooltip: string

The tooltip of the button.

Used as the button label if an icon is not specified.

---

### propertyName: string

Identifies the menu item. This is used to indicate which item was clicked in the callback.

---

### icon?: string

If specified, it will be used to render the button; otherwise, we'll fallback to the tooltip as the button label.

info

The provided svg should contain the following attribute to be valid: xmlns="<http://www.w3.org/2000/svg>"

---

## `WidgetPropertyMenuSeparatorItem`[​](#widgetpropertymenuseparatoritem "Direct link to widgetpropertymenuseparatoritem")

The separator item is a non-interactive element. While not required to use, using separators is a way to organize large property menus by grouping related property menu items together.

![PropertyMenuSeparatorExample](https://static.figma.com/uploads/d42b97e7c89f7ba94443693e6f2dc2c5d922b179)

```
interface WidgetPropertyMenuSeparatorItem {  
  itemType: 'separator'  
}
```

### itemType: 'separator'

Specifies the separator item type.

---

## `WidgetPropertyMenuColorItem`[​](#widgetpropertymenucoloritem "Direct link to widgetpropertymenucoloritem")

The color selector item is a way for your widget to provide users a way to pick colors. For example, this can be a way to change the theme of your widget.

![PropertyMenuColorExample](https://static.figma.com/uploads/b8eebc9c3e890149cf65acdd93374baca586c9b9)

```
interface WidgetPropertyMenuColorSelectorOption {  
  tooltip: string  
  option: HexCode  
}  
  
interface WidgetPropertyMenuColorItem {  
  itemType: 'color-selector'  
  tooltip: string  
  propertyName: string  
  options: WidgetPropertyMenuColorSelectorOption[]  
  selectedOption: string  
}
```

### itemType: 'color-selector'

Specifies the color selector item type.

---

### tooltip: string

The tooltip of the selector.

---

### propertyName: string

Identifies the menu item. This is used to indicate which item was clicked in the callback.

---

### options: WidgetPropertyMenuColorSelectorOption[]

Array of color options to display to the user when selected. This array cannot be empty.

---

### selectedOption: string

The currently selected color. This option string should match one of the `option` values specified in `options`.

---

## `WidgetPropertyMenuDropdownItem`[​](#widgetpropertymenudropdownitem "Direct link to widgetpropertymenudropdownitem")

The dropdown item allows users to select from an array of `WidgetPropertyMenuDropdownOption`.

In `WidgetPropertyMenuDropdownOption`, the `label` field will be displayed to the user.

![PropertyMenuDropdownExample](https://static.figma.com/uploads/bda3b6587a3c25bf8c9e102acedf40d31d696c73)

```
 interface WidgetPropertyMenuDropdownOption {  
  option: string  
  label: string // displayed in dropdown  
}  
  
interface WidgetPropertyMenuDropdownItem {  
  itemType: 'dropdown'  
  tooltip: string  
  propertyName: string  
  options: WidgetPropertyMenuDropdownOption[]  
  selectedOption: string  
}
```

### itemType: 'dropdown'

Specifies the dropdown item type.

---

### tooltip: string

The tooltip of the dropdown component.

---

### propertyName: string

Identifies the menu item. This is used to indicate which item was clicked in the callback.

---

### options: WidgetPropertyMenuDropdownOption[]

An array of options. This array cannot be empty.

---

### selectedOption: string

The currently selected option. This option string should match one of the `option` values specified in `options

---

## `WidgetPropertyMenuToggleItem`[​](#widgetpropertymenutoggleitem "Direct link to widgetpropertymenutoggleitem")

The toggle item provides a button that allows the user to toggle a boolean value in the property menu. When selected, the property menu callback will be called with the corresponding `propertyName` of the item. isToggled highlights the button when set to true.

![PropertyMenuToggleExample](https://static.figma.com/uploads/82d35b9a0ad3095e212b8570196e4a6b8dfe9b5d)
![PropertyMenuToggleActiveExample](https://static.figma.com/uploads/9e8d4952de540b886a05755231dbf4d0149add6c)

```
interface WidgetPropertyMenuToggleItem {  
  itemType: 'toggle'  
  tooltip: string  
  propertyName: string  
  isToggled: boolean  
  icon?: string  
}
```

### itemType: 'toggle'

Specifies the toggle item type.

---

### tooltip: string

The tooltip of the button.

Used as the button label if an icon is not specified.

---

### propertyName: string

Identifies the menu item. This is used to indicate which item was clicked in the callback.

---

### isToggled: boolean

The state of the toggle.

---

### icon?: string

If specified, it will be used to render the button; otherwise, we'll fallback to the tooltip as the button label.

info

The provided svg should contain the following attribute to be valid: xmlns="<http://www.w3.org/2000/svg>"

---

## `WidgetPropertyMenuLinkItem`[​](#widgetpropertymenulinkitem "Direct link to widgetpropertymenulinkitem")

The link item allows users to natively open links to other pages. There are some benefits to opening links this way, namely:

- The link opens in a new tab.
- The link menu item type is easier than using an iFrame to open links.
- The link renders natively with an `<a>` tag, which prevents users from getting blocked by their browsers.

Importantly, the link menu item type does not trigger a property menu callback.

![PropertyMenuLinkExample](https://static.figma.com/uploads/c6a949b138023a025532ee34b74585d2d2f97dde)

```
interface WidgetPropertyMenuLinkItem {  
  itemType: 'link'  
  tooltip: string  
  propertyName: string  
  href: string  
  icon?: string  
}
```

### itemType: 'link'

Specifies the link item type.

---

### tooltip: string

The tooltip of the link component.

---

### propertyName: string

Identifies the menu item.

---

### href: string

The URL that opens when a user clicks the link item.

---

### icon?: string | null

If specified, it will be used to render the button; otherwise, we'll fallback to a default icon that looks like the image below:

![DefaultLinkIcon](https://static.figma.com/uploads/357ced3a754c95d44940b0067906f4b13ce5bc15)

In order to render the tooltip as the button's text, pass `null` as the value of `icon`.

info

The provided svg should contain the following attribute to be valid: xmlns="<http://www.w3.org/2000/svg>"

---

## `WidgetPropertyEvent`[​](#widgetpropertyevent "Direct link to widgetpropertyevent")

The widget property event is an passed into the `onChange` function. Here is a summary of the `WidgetPropertyEvent` for each `itemType`. Note that the `"separator"` and `"link"` item types will not trigger the `onChange` function.

| itemType | propertyName | propertyValue |
| --- | --- | --- |
| `"action"` | Yes | `undefined` |
| `"color-selector"` | Yes | hexcode `string` of the selected color. |
| `"dropdown"` | Yes | `string` of the selected option in the dropdown. |
| `"toggle"` | Yes | `undefined` |
| `"separator"` | N/A | N/A |
| `"link"` | N/A | N/A |

```
type WidgetPropertyEvent = {  
  propertyName: string  
  propertyValue?: string | undefined  
}
```

### propertyName: string

The propertyName of the item that was clicked.

---

### propertyValue?: string | undefined

The propertyValue of the item that was selected. This value will be a string value for `"dropdown"` and `"color-selector"` item types.

---

[Previous

PlaceholderProps](type-PlaceholderProps.md)[Next

Size](type-Size.md)

- [`WidgetPropertyMenuItem`](#widgetpropertymenuitem)
- [`WidgetPropertyMenuActionItem`](#widgetpropertymenuactionitem)
- [`WidgetPropertyMenuSeparatorItem`](#widgetpropertymenuseparatoritem)
- [`WidgetPropertyMenuColorItem`](#widgetpropertymenucoloritem)
- [`WidgetPropertyMenuDropdownItem`](#widgetpropertymenudropdownitem)
- [`WidgetPropertyMenuToggleItem`](#widgetpropertymenutoggleitem)
- [`WidgetPropertyMenuLinkItem`](#widgetpropertymenulinkitem)
- [`WidgetPropertyEvent`](#widgetpropertyevent)
