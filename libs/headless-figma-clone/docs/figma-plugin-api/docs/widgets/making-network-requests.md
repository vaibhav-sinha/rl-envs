<!-- source: https://developers.figma.com/docs/widgets/making-network-requests -->

- Widgets
- Development Guides
- Making Network Requests

On this page

This guide describes how to make basic network requests, test network access, and specify the scope of your widget's network access. As a best practice, Figma recommends that your widget only allows domains that are needed for your widget to work.

In practice, you first develop your widget and implement all the required network requests. Then, before publishing, you can use the instructions in this guide to specify access to only the domains used by your widget.

- [Make network requests](#make-network-requests)
- [Test network access](#test-network-access)
- [Specify network access](#specify-network-access)

---

## Make network requests[​](#make-network-requests "Direct link to Make network requests")

Making network requests with widgets is very similar to making network requests with [plugins](../plugins/making-network-requests.md). The widget approach [uses the Plugin API](using-the-plugin-api.md), and so has the same requirements and limitations as other uses of the Plugin API.

note

This guide assumes that you’re familiar with the basics of creating Figma widgets. If you’re new to developing plugins and widgets, check out the [Build your first plugin](https://help.figma.com/hc/en-us/articles/4407260620823--BYFP-1-Overview) course — you can copy and paste the code from this guide into widgets you build.

The following code sample creates an element that, when clicked, uses the Fetch API to make a request. The response is then rendered in a new text node.

code.tsx

```
const { widget } = figma;  
const { Text } = widget;  
  
// This widget fetches a resource and renders the text response in a rectangle.  
function Widget() {  
  return (  
    <Text  
      fontSize={24}  
      onClick={  
        () =>  
          (async () => {  
            const response = await fetch('https://httpbin.org/get?success=true')  
            const json = await response.json()  
            const textNode = figma.createText()  
            // Make sure the new text node is visible where we're currently looking  
            textNode.x = figma.viewport.center.x  
            textNode.y = figma.viewport.center.y  
  
            await figma.loadFontAsync(textNode.fontName as FontName)  
  
            // success=true!  
            textNode.characters = JSON.stringify(json.args, null, 2)  
            figma.closePlugin()  
          })()  
      }  
    >  
      Show fetch response  
    </Text>  
  );  
}  
  
widget.register(Widget);
```

Because widgets run inside a browser environment, [Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) policies apply. Widget iframes have a `null` origin. This means that they will only be able to call APIs with `Access-Control-Allow-Origin: *` (i.e., those that allow access from any origin).

info

Previously, to make network requests within a widget, you had to implement an iframe to handle sending requests and receiving data. While widgets implemented this way will continue to function normally and do not need to be modified, we recommend using the simpler [Fetch API](../plugins/api/properties/global-fetch.md) approach. The Fetch API is provided by the Plugin API, which can be used with your widgets.

---

## Test network access[​](#test-network-access "Direct link to Test network access")

After you've implemented network requests in your widget, whether calls to an API or getting images from a server, test the impact of limiting your widget's network access. Then, use the results of your testing to build the list of domains you need to appropriately [limit network access](#limit-network-access).

To test the impact of limiting your widget's network access:

1. In your widget's `manifest.json`, add the `networkAccess` key with the `allowedDomains` property set to `["none"]`.

   Manifest.json

   ```
   {  
     "name": "MyWidget",  
     "id": "737805260747778093",  
     "api": "1.0.0",  
     "widgetApi": "1.0.0",  
     "editorType": ["figma", "figjam"],  
     "containsWidget": true,  
     "main": "code.js",  
     "ui": "ui.html",  
     "networkAccess": {  
       "allowedDomains": ["none"]  
     }  
   }
   ```
2. In Figma, try to use your widget as normal. In the developer console, note any content-security policy (CSP) errors. For example, if the request in [Make network requests](#make-network-requests) was blocked:

   CSP error

   ```
   Refused to connect to 'https://httpsbin.org/' because it violates the following Content Security Policy directive: "default-src data:".  
   Note that 'connect-src' was not explicitly set, so 'default-src' is used as a fallback.
   ```
3. As you identify CSP errors, follow the [Limit network access](#limit-network-access) steps to remove `"none"` and add the domains that your widget requires to the `allowedDomains` list.

When you're confident that all the required domains are listed in `allowedDomains` and you no longer encounter CSP errors, testing is complete.

---

## Specify network access[​](#specify-network-access "Direct link to Specify network access")

To specify a list of domains that your widget is allowed to access, you update the widget's `manifest.json` file:

1. In your widget's `manifest.json`, add the `networkAccess` key. `networkAccess` has the following properties: `allowedDomains`, `reasoning`, and `devAllowedDomains`.

   Manifest.json

   ```
   {  
     "name": "MyWidget",  
     "id": "737805260747778093",  
     "api": "1.0.0",  
     "widgetApi": "1.0.0",  
     "editorType": ["figma", "figjam"],  
     "containsWidget": true,  
     "main": "code.js",  
     "ui": "ui.html",  
     "networkAccess": {  
       "allowedDomains": [],  
       "reasoning": "",  
       "devAllowedDomains": []  
     }  
   }
   ```
2. Add domains to the `allowedDomains` list. The domains that you add to the list should correspond to the domains that you are making requests to. This includes any requests you make for external resources using methods like createImageAsnyc().

   For example, to limit a widget's access to only the `httpbin.org` domain used in [Make network requests](#make-network-requests):

   Manifest.json

   ```
   {  
     "name": "MyWidget",  
     "id": "737805260747778093",  
     "api": "1.0.0",  
     "widgetApi": "1.0.0",  
     "editorType": ["figma", "figjam"],  
     "containsWidget": true,  
     "main": "code.js",  
     "ui": "ui.html",  
     "networkAccess": {  
       "allowedDomains": ["httpbin.org"],  
       "reasoning": "",  
       "devAllowedDomains": []  
     }  
   }
   ```

   If the only endpoint the widget uses is `/get`, make the string in the `allowedDomains` list even more granular:

   Manifest.json

   ```
   {  
     "name": "MyWidget",  
     "id": "737805260747778093",  
     "api": "1.0.0",  
     "widgetApi": "1.0.0",  
     "editorType": ["figma", "figjam"],  
     "containsWidget": true,  
     "main": "code.js",  
     "ui": "ui.html",  
     "networkAccess": {  
       "allowedDomains": ["httpbin.org/get"],  
       "reasoning": "",  
       "devAllowedDomains": []  
     }  
   }
   ```

   This way, no unexpected requests can be made to other endpoints on the domain.

   note

   There are several patterns that can be used to specify domains for `allowedDomains`. For a complete list, see [Widget Manifest](widget-manifest.md). You can also specify:

   - `["none"]`: `none` is a special keyword that prevents all network access. Use this if your widget doesn't make any network requests.
   - `["*"]`: `*` is a special character that permits your widget to access any domain. If your widget includes `*` in `allowedDomains`, then `reasoning` is required.
3. For `reasoning`, provide a brief explanation for the access scope permitted by `allowedDomains`. When you publish your widget, this explanation is visible on your widget's Community page along with the list of allowed domains.

   For example:

   Manifest.json

   ```
   {  
     "name": "MyWidget",  
     "id": "737805260747778093",  
     "api": "1.0.0",  
     "widgetApi": "1.0.0",  
     "editorType": ["figma", "figjam"],  
     "containsWidget": true,  
     "main": "code.js",  
     "ui": "ui.html",  
     "networkAccess": {  
       "allowedDomains": ["httpbin.org/get"],  
       "reasoning": "MyPlugin queries httpbin.org/get for example responses.",  
       "devAllowedDomains": []  
     }  
   }
   ```
4. If you need to access a local or development web server to build your widget, add its domain(s) to the `devAllowedDomains` list. The domains that you add to the list should correspond to the local URL(s) for your development server. If you want to access a local or development web server in `allowedDomains`, then `reasoning` is required.

   For example:

   Manifest.json

   ```
   {  
     "name": "MyPlugin",  
     "id": "737805260747778092",  
     "api": "1.0.0",  
     "main": "code.js",  
     "ui": "ui.html",  
     "networkAccess": {  
       "allowedDomains": ["httpbin.org/get"],  
       "reasoning": "MyPlugin queries httpbin.org/get for example responses.",  
       "devAllowedDomains": ["http://localhost:3000"]  
     }  
   }
   ```
5. Save the changes to your manifest.

After `networkAccess` is implemented, Figma enforces the list of domains that you gave for `allowedDomains`. If a request originates from your widget to a domain not in `allowedDomains`, Figma blocks the request and throws a [content-security policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) error.

For example, if our widget attempts to make a request to `httpbin.org/post`, we get the following error:

CSP error

```
Refused to connect to 'https://httpbin.org/post' because it violates the following Content Security Policy directive: "default-src data:". Note that 'connect-src' was not explicitly set, so 'default-src' is used as a fallback.
```

[Previous

Handling User Events](handling-user-events.md)[Next

Text Editing](text-editing.md)

- [Make network requests](#make-network-requests)
- [Test network access](#test-network-access)
- [Specify network access](#specify-network-access)
