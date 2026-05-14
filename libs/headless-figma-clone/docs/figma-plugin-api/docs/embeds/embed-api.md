<!-- source: https://developers.figma.com/docs/embeds/embed-api -->

- Embeds
- Embed API

On this page

When you embed a Figma prototype, you can use Figma's Embed API to trigger actions in the embedded prototype by sending messages, and handle events caused by user actions that are emitted by the prototype.

## Get started with the Embed API[​](#get-started-with-embed-api "Direct link to Get started with the Embed API")

To use the Embed API, you must:

1. Create an [OAuth app](https://figma.com/developers/apps). Provide a name, website, and logo for the OAuth app.
2. Copy the client id for your OAuth app. The client id is required to used the Embed API.
3. In the list of your OAuth apps, click the OAuth app that you created for your embeds.
4. In the modal for your app, click **Embed API**, and then **Add an embed origin**. The embedded prototype will only accept messages from and send events to the origins that you allow.
5. Add the `client-id` query parameter to the iframe URL for your embedded prototype. Set the value to your OAuth app's client id.
6. Implement code to [send messages that control the prototype](#control-prototype) and handle [events caused by user actions](#get-events).

## Example prototype using the Embed API[​](#example-prototype-using-the-embed-api "Direct link to Example prototype using the Embed API")

Suppose you want to provide buttons in your interface that a user can click to navigate to different frames or pages in the prototype. You also want to get events from the prototype so you can track how a prototype is used or have your interface react to the events.

Prototype controls:

←Restart→

Events:

Let's create a basic site that embeds a Figma prototype, has a few basic controls, and is able to send and receive messages so we can interact with the prototype and react to its state.

tip

Tip: For a version of the example site that includes CSS styling and the event viewer, see the figma/embed-kit-2.0-example GitHub repository.

Our site has two files:

- [index.html](#example-index-file), where we implement the embed and define the controls that a viewer can use with the embed
- [script.js](#example-script-file), where we handle the logic that sends our messages and reacts to events we get from the prototype

We also follow the [Get started with the Embed API](#get-started-with-embed-api) steps to obtain a client id and add an allowed embed origin for the domain where we're hosting our site.

### Example: `index.html`[​](#example-index-file "Direct link to example-index-file")

On our site, we want to embed a Figma prototype from one of our files. We also want to implement some basic controls: buttons that the viewer can use to navigate through the prototype and restart it.

Let's put together the HTML for our site.

```
<html>  
  <head>  
    <title>My Embedded Prototype</title>  
    <script src="script.js" defer></script>  
  </head>  
  <body>  
    <iframe  
      id="embed-frame"  
      height="600"  
      width="800"  
      src="https://embed.figma.com/proto/acDzTcMe9zjkq0b/Example-embed-file  
          ?node-id=5019-210  
          &embed-host=example-domain  
          &client-id=6rtt685EC"  
      allowFullscreen  
    ></iframe>  
    <div id="controls">  
      <div>Prototype controls:</div>  
      <div id="buttons">  
        <button id="prev" disabled>&larr;</button>  
        <button id="restart" disabled>Restart</button>  
        <button id="next" disabled>&rarr;</button>  
      </div>  
    </div>  
  </body>  
</html>
```

Let's take a quick look at the code.

In the `head`, we define the `title` for our site and link to our script.js file, where we'll handle the site logic. We `defer` the script because we'll be interacting with elements on the page and we want to be sure the DOM is ready before our script runs.

```
<head>  
  <title>My Embedded Prototype</title>  
  <script src="script.js" defer></script>  
</head>
```

In the `body`, we first add the `iframe` for our prototype.

```
<iframe  
  id="embed-frame"  
  src="https://embed.figma.com/proto/acDzTcMe9zjkq0b/Example-embed-file  
      ?node-id=5019-210  
      &embed-host=example-domain  
      &client-id=6rtt685EC"  
  allowFullscreen  
></iframe>
```

The `src` for our `iframe` includes the `client-id` query parameter. The value for `client-id` is the client id that we obtained when we [set up the OAuth app](#get-started-with-embed-api) for the Embed API.

Then we add the `div` that holds the controls for our prototype. We'll start with the buttons `disabled` because we only want the controls to work after the embedded prototype has finished loading.

```
<div id="controls">  
  <div>Prototype controls:</div>  
  <div id="buttons">  
    <button id="prev" disabled>Previous page</button>  
    <button id="restart" disabled>Restart</button>  
    <button id="next" disabled>Next page</button>  
  </div>  
</div>
```

We've assigned an `id` to each of the critical elements in our site so it'll be easier to reference the elements in our script and style them later on. With our site's structure in place, let's move on to the JavaScript we'll use for our site logic.

### Example: `script.js`[​](#example-script-file "Direct link to example-script-file")

The logic for our site needs to do a couple things:

- Send messages to the embed iframe, so we can navigate through and restart the prototype
- Handle events that are coming from the embed iframe, so we can have our site react to the state of the embedded prototype

Let's put together the JavaScript for our site.

```
// Constants for the site logic  
const iframe = document.querySelector("#embed-frame");  
const figmaOrigin = "https://www.figma.com";  
  
// Messages to control the prototype  
function nextPage() {  
  iframe.contentWindow.postMessage(  
    {  
      type: "NAVIGATE_FORWARD"  
    },  
    figmaOrigin  
  );  
}  
  
function previousPage() {  
  iframe.contentWindow.postMessage(  
    {  
      type: "NAVIGATE_BACKWARD"  
    },  
    figmaOrigin  
  );  
}  
  
function restartPrototype() {  
  iframe.contentWindow.postMessage(  
    {  
      type: "RESTART"  
    },  
    figmaOrigin  
  );  
}  
  
const restartButton = document.querySelector("#restart");  
const nextButton = document.querySelector("#next");  
const prevButton = document.querySelector("#prev");  
  
restartButton.addEventListener("click", restartPrototype);  
nextButton.addEventListener("click", nextPage);  
prevButton.addEventListener("click", previousPage);  
  
// Logic to handle events from the prototype  
window.addEventListener("message", (event) => {  
  if (event.origin === figmaOrigin) {  
    if (event.data.type === "INITIAL_LOAD") {  
      restartButton.removeAttribute("disabled");  
      nextButton.removeAttribute("disabled");  
    }  
  
    if (event.data.type === "PRESENTED_NODE_CHANGED") {  
      const nodeId = event.data.data.presentedNodeId;  
  
      if (nodeId === "5019:210") {  
        prevButton.setAttribute("disabled", "");  
      } else if (prevButton.hasAttribute("disabled")) {  
        prevButton.removeAttribute("disabled");  
      }  
  
      if (nodeId === "5019:72") {  
        nextButton.setAttribute("disabled", "");  
      } else if (nextButton.hasAttribute("disabled")) {  
        nextButton.removeAttribute("disabled");  
      }  
    }  
  } else {  
    console.warn(  
      "Received message from an unexpected origin:",  
      event.origin  
    );  
  }  
});
```

Let's break down the code in our script.js file.

First, we set two constants that we reuse throughout our script: `iframe` and `figmaOrigin`. `iframe` stores the reference to the iframe for our embedded prototype, so we can use it for sending messages. `figmaOrigin` contains the origin for messages from Figma, a value we need both for sending messages and handling events.

```
// Constants for the site logic  
const iframe = document.querySelector("#embed-frame");  
const figmaOrigin = "https://www.figma.com";
```

Next, we set up the functions that send messages to our embedded prototype.

```
// Messages to control the prototype  
function nextPage() {  
  iframe.contentWindow.postMessage(  
    {  
      type: "NAVIGATE_FORWARD"  
    },  
    figmaOrigin  
  );  
}  
  
function previousPage() {  
  iframe.contentWindow.postMessage(  
    {  
      type: "NAVIGATE_BACKWARD"  
    },  
    figmaOrigin  
  );  
}  
  
function restartPrototype() {  
  iframe.contentWindow.postMessage(  
    {  
      type: "RESTART"  
    },  
    figmaOrigin  
  );  
}
```

The `NAVIGATE_FORWARD`, `NAVIGATE_BACKWARD`, and `RESTART` messages all have a simple format. Some messages, such as `NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS`, require a `data` property in addition to `type`.

Next, we select our `buttons` using their `ids`, and then assign event listeners to handle users clicking the buttons. The event listeners trigger the functions we defined earlier.

```
const restartButton = document.querySelector("#restart");  
const nextButton = document.querySelector("#next");  
const prevButton = document.querySelector("#prev");  
  
restartButton.addEventListener("click", restartPrototype);  
nextButton.addEventListener("click", nextPage);  
prevButton.addEventListener("click", previousPage);
```

The events coming from our prototype, the events we want to handle, are sent to the [window](https://developer.mozilla.org/en-US/docs/Web/API/Window). We want to filter the messages so we're specifically handling messages from the Figma origin. To do that, we set up some initial event handling.

```
// Logic to handle events from the prototype  
window.addEventListener("message", (event) => {  
  if (event.origin === figmaOrigin) {  
  
  } else {  
    console.warn(  
      "Received message from an unexpected origin:",  
      event.origin  
    );  
  }  
});
```

When our `window` gets a `message` event, we check if the event's origin corresponds to the Figma origin, where our prototype sends messages from. We include a simple warning in case we get messages from any unexpected origins.

Next, in our `if` statement, we start to add the logic for handling individual events. First, we want to enable the **Restart** and **Next page** buttons only after the prototype has finished loading. To do that, we'll look for the `INITIAL_LOAD` event from our embedded prototype.

```
if (event.data.type === "INITIAL_LOAD") {  
  restartButton.removeAttribute("disabled");  
  nextButton.removeAttribute("disabled");  
}
```

When we get the `INITIAL_LOAD` message, we remove the `disabled` attribute from the buttons.

We also want to add logic for enabling and disabling our **Previous frame** and **Next frame** buttons based on where the user is in the prototype. We want to make sure that if the user is on the first frame of the prototype that **Previous frame** is disabled (since the user can't navigate any further back), and similarly, that **Next frame** is disabled on the last frame of the prototype.

```
if (event.data.type === "PRESENTED_NODE_CHANGED") {  
  const nodeId = event.data.data.presentedNodeId;  
  
  if (nodeId === "5019:210") {  
    prevButton.setAttribute("disabled", "");  
  } else if (prevButton.hasAttribute("disabled")) {  
    prevButton.removeAttribute("disabled");  
  }  
  
  if (nodeId === "5019:72") {  
    nextButton.setAttribute("disabled", "");  
  } else if (nextButton.hasAttribute("disabled")) {  
    nextButton.removeAttribute("disabled");  
  }  
}
```

When a user navigates to a different frame in a prototype, the `PRESENTED_NODE_CHANGED` event is triggered. To know what frame the user is on, we handle `PRESENTED_NODE_CHANGED` and get the `presentedNodeId` (the new node the user is looking at). For this example, assume that `5019:210` is the node id of the first frame in our prototype flow, and that `5019:72` is the last frame.

And that's it! We've built our basic site. We followed [Get started with the Embed API](#get-started-with-embed-api), set up the [HTML for our site](#example-index-file), implemented the [logic to handle messages and events](#example-script-file), and our site is ready to be used at the domain we added as an allowed embed origin.

## Control a prototype with messages[​](#control-prototype "Direct link to Control a prototype with messages")

The Embed API uses [messages](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) to handle cross-origin communication with the iframe. When the embedded prototype receives a supported message, it triggers the corresponding behavior.

For example, the following function sends a message that restarts the prototype from its starting node:

```
function restartPrototype(iframe) {  
  iframe.contentWindow.postMessage(  
    {  
      type: "RESTART"  
    },  
      "https://www.figma.com"  
  );  
}
```

The `type` key is required for each message you send to an embedded prototype. Depending on the `type`, you may need to include additional keys in the message object.

The following message `types` are supported:

- [`NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS`](#navigate-to-frame)
- [`NAVIGATE_FORWARD`](#navigate-forward)
- [`NAVIGATE_BACKWARD`](#navigate-backward)
- [`CHANGE_COMPONENT_STATE`](#change-component-state)
- [`RESTART`](#restart)

The second argument for the [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#syntax) method (the target origin) must always be `https://www.figma.com`.

The following sections describe the requirements for each `type` of message.

### NAVIGATE\_TO\_FRAME\_AND\_CLOSE\_OVERLAYS[​](#navigate-to-frame "Direct link to NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS")

This message closes any overlays that are open in the prototype and then navigates to the given node id.

```
{  
  type: "NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS",  
  data: {  
    nodeId: nodeId  
  },  
}
```

Where:

- `data.nodeId` is the node id that you want the prototype to navigate to. For example, `1:13`.

### NAVIGATE\_FORWARD[​](#navigate_forward "Direct link to NAVIGATE_FORWARD")

When the prototype has a sequence of frames, the prototype navigates to the next frame in the order.

```
{  
  type: "NAVIGATE_FORWARD"  
}
```

### NAVIGATE\_BACKWARD[​](#navigate_backward "Direct link to NAVIGATE_BACKWARD")

When the prototype has a sequence of frames, the prototype navigates to the previous frame in the order.

```
{  
  type: "NAVIGATE_BACKWARD"  
}
```

### CHANGE\_COMPONENT\_STATE[​](#change_component_state "Direct link to CHANGE_COMPONENT_STATE")

The given component in the prototype is changed to the provided state.

```
{  
  type: "CHANGE_COMPONENT_STATE",  
  data: {  
    nodeId: string  
    newVariantId: string  
  }  
}
```

Where:

- `data.nodeId` is the node id of the component that you want to change the state of.
- `data.newVariantId` is the id of the variant (the state) that you want to change the component to.

### RESTART[​](#restart "Direct link to RESTART")

This message causes the prototype to restart from its starting node.

```
{  
  type: "RESTART"  
}
```

## Get events caused by user actions[​](#get-events "Direct link to Get events caused by user actions")

Embedded prototypes emit events based on different user actions. Similar to the messages you send to control a prototype, events emitted by the prototype are messages sent from the iframe. You can listen for the messages, and then react to the message based on its `type` and the `data` included.

The following code is an example event listener that captures events from `www.figma.com`, the common origin of messages from the iframe:

```
// Event listener to capture messages from the iframe  
window.addEventListener("message", (event) => {  
  // Ensure the message is coming from the expected iframe origin  
  const expectedOrigin = "https://www.figma.com";  
  if (event.origin === expectedOrigin) {  
    console.log("Received message from prototype iframe:", event.data);  
    // Handle the event data as needed  
  } else {  
    console.warn("Received message from an unexpected origin:", event.origin);  
  }  
});
```

The following event message `types` can be emitted by prototype:

- [`MOUSE_PRESS_OR_RELEASE`](#mouse-press)
- [`PRESENTED_NODE_CHANGED`](#presented-node-changed)
- [`INITIAL_LOAD`](#initial-load)
- [`NEW_STATE`](#new-state)
- [`REQUEST_CLOSE`](#request-close)
- [`LOGIN_SCREEN_SHOWN`](#login-screen-shown)
- [`PASSWORD_SCREEN_SHOWN`](#password-screen-shown)

The origin of the events emitted by the prototype is always `https://www.figma.com`.

The following sections describe the structure of each `type` of event message.

### MOUSE\_PRESS\_OR\_RELEASE[​](#mouse-press "Direct link to MOUSE_PRESS_OR_RELEASE")

The `MOUSE_PRESS_OR_RELEASE` event provides data about user-clicks (or click-like events). This can be useful for scenarios such as generating a heat map of the user's activity in the prototype.

```
interface Position {  
  x: number  
  y: number  
}  
  
interface ScrollOffset {  
  x: number  
  y: number  
}  
  
interface MousePressOrReleaseMessage {  
  type: 'MOUSE_PRESS_OR_RELEASE'  
  data: {  
    // If there are overlays showing, this is the node id of the  
    // topmost overlay on screen. If there are no overlays showing  
    // it's the id of the screen we're showing.  
    presentedNodeId: string  
  
    // Whether or not the user clicked a hotspot.  
    handled: boolean  
  
    // When this event isn't handled, this is the topmost  
    // layer under the cursor.  
    targetNodeId: string  
  
    // Position relative to the top left corner of the target node;  
    // this is unaffected by whether the target node is a scrolling  
    // frame and has been scrolled.  
    targetNodeMousePosition: Position  
  
    // The nested-most scrolling frame enclosing the targetNode, or  
    // the targetNode if it scrolls.  
    nearestScrollingFrameId: string  
  
    // Position relative to the top left corner of the scrolling frame;  
    // this is unaffected by whether the target node is a scrolling  
    // frame and has been scrolled.  
    nearestScrollingFrameMousePosition: Position  
  
    // The scroll offset of the above scrolling frame. If the target  
    // node is a scrolling frame, you can use this and targetNodeLocation  
    // to find where the click happened in the layer content bounds.  
    nearestScrollingFrameOffset: ScrollOffset  
  }  
}
```

### PRESENTED\_NODE\_CHANGED[​](#presented_node_changed "Direct link to PRESENTED_NODE_CHANGED")

The `PRESENTED_NODE_CHANGED` event describes navigation from one frame to another, or one overlay to another.

```
interface PresentedNodeChangedMessage {  
  type: 'PRESENTED_NODE_CHANGED',  
  data: {  
    // The ID of the top-most node on screen; either an overlay node id  
    // or the id of the top level frame if there are no overlays showing.  
    presentedNodeId: string  
  
    // In Figma, users can create connections that go "back" to the previous  
    // frame. To do this, Figma maintains its own history stack of frames that  
    // the user has navigated through.  
    //  
    // We intentionally exclude some transitions from the history stack: ones  
    // triggered via hover, mouse in and mouse out because this best matches  
    // user expectations.  
    isStoredInHistory: boolean  
  
    // A map of (string) developer friendly node IDs of instances  
    // -> (string) symbol IDs that they inherit from. This is useful for  
    // determining the current states of interactive components on the screen.  
    // This map only contains entries for instances in the current base screen  
    // as well as any overlays being displayed.  
    stateMappings: {  
      [developerFriendlyNodeId: string]: string  
    }  
  }  
}
```

### INITIAL\_LOAD[​](#initial_load "Direct link to INITIAL_LOAD")

The `INITIAL_LOAD` event is triggered when the embedded prototype finishes loading for the first time.

```
interface InitialLoadMessage {  
  type: 'INITIAL_LOAD'  
  data: {}  
}
```

### NEW\_STATE[​](#new_state "Direct link to NEW_STATE")

The `NEW_STATE` event is triggered when a component instance in the prototype changes to a new variant.

```
interface NewStateMessage {  
  type: 'NEW_STATE'  
  data: {  
    // The developer-friendly node ID of the instance that changed state.  
    nodeId: string  
  
    // The state ID (symbol ID) of the instance before the swap.  
    currentVariantId: string  
    // The state ID (symbol ID) of the instance after the swap.  
    newVariantId: string  
    // Same as PresentedNodeChangedMessage  
    isStoredInHistory: boolean  
    // Whether or not this was caused by an "after delay" interaction.  
    // This is important b/c people use these for looping animations etc.  
    isTimedChange: boolean  
  }  
}
```

### REQUEST\_CLOSE[​](#request_close "Direct link to REQUEST_CLOSE")

The `REQUEST_CLOSE` event is triggered when a user hits the Spacebar in the inline preview as a way to request closing the viewer.

```
interface RequestCloseMessage {  
  type: 'REQUEST_CLOSE',  
  data: {}  
}
```

### LOGIN\_SCREEN\_SHOWN[​](#login_screen_shown "Direct link to LOGIN_SCREEN_SHOWN")

The `LOGIN_SCREEN_SHOWN` event is triggered when a user sees a Figma login screen. Users may see a login screen if they are trying to view an embed that is private and they're not logged into Figma.

```
interface LoginScreenShownMessage {  
  type: 'LOGIN_SCREEN_SHOWN',  
  data: {}  
}
```

### PASSWORD\_SCREEN\_SHOWN[​](#password_screen_shown "Direct link to PASSWORD_SCREEN_SHOWN")

The `PASSWORD_SCREEN_SHOWN` event is triggered when a user tries to view a password-protected embed and needs to enter a password.

```
interface PasswordScreenShownMessage {  
  type: 'PASSWORD_SCREEN_SHOWN',  
  data: {}  
}
```

[Previous

Embed a Figma prototype](embed-figma-prototype.md)[Next

Resources](resources.md)

- [Get started with the Embed API](#get-started-with-embed-api)
- [Example prototype using the Embed API](#example-prototype-using-the-embed-api)
  - [Example: `index.html`](#example-index-file)
  - [Example: `script.js`](#example-script-file)
- [Control a prototype with messages](#control-prototype)
  - [NAVIGATE\_TO\_FRAME\_AND\_CLOSE\_OVERLAYS](#navigate-to-frame)
  - [NAVIGATE\_FORWARD](#navigate_forward)
  - [NAVIGATE\_BACKWARD](#navigate_backward)
  - [CHANGE\_COMPONENT\_STATE](#change_component_state)
  - [RESTART](#restart)
- [Get events caused by user actions](#get-events)
  - [MOUSE\_PRESS\_OR\_RELEASE](#mouse-press)
  - [PRESENTED\_NODE\_CHANGED](#presented_node_changed)
  - [INITIAL\_LOAD](#initial_load)
  - [NEW\_STATE](#new_state)
  - [REQUEST\_CLOSE](#request_close)
  - [LOGIN\_SCREEN\_SHOWN](#login_screen_shown)
  - [PASSWORD\_SCREEN\_SHOWN](#password_screen_shown)
