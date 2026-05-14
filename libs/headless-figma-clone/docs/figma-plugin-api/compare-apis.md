<!-- source: https://developers.figma.com/compare-apis -->

# Compare the Figma APIs

Learn how Figma's APIs can support the use cases of your work and organization! Figma provides the [Plugin API](docs/plugins.md), [Widget API](docs/widgets.md), and [REST API](docs/rest-api.md), powerful developer interfaces that let you extend how Figma can be used by you, your team, and the entire Figma community. On this page, we dive into the differences between our APIs.

## API overview

The **Plugin API** enables you to create interactive experiences that extend what Figma can do. For example, you can use plugins to:

- Generate content or ideas with AI
- Bring outside content like stock photos into Figma
- Insert context from other tools, like your project tracker, into Figma

The **Widget API** enables you to create custom interactive on-canvas nodes with rich user interfaces that can be applied to the Figma or FigJam canvas. For example, you can use widgets to:

- Show an alignment scale where all the viewers of a file can vote on how aligned they feel
- Stamp the canvas with emojis or custom stickers
- Show a snippet of information, like the details of a ticket or work item, from a project tracker

The **REST API** enables you to access your Figma files from your own script, tool, or app. You can use the REST API to:

- Automate syncing your Figma libraries to and from your codebase
- Write a custom automation script or app
- Bring the best of Figma into your own apps and experiences as one of our [integration partners](https://www.figma.com/product-integrations/)

## API comparison

This section breaks down Figma's APIs by interaction model, use case, and more. Use these comparisons to determine the right API for what you're trying to build.

### Interaction models

#### Plugin API

**In Figma and FigJam:** A user has a particular Figma design or FigJam file open; the plugin is reading or writing to that file as they work. The plugin might also be sending details to other apps, like updating a ticket in Jira.

#### Widget API

**In Figma and FigJam:** A user has a particular Figma design or FigJam file open; the widget is added to the canvas of that file. The widget persists on the canvas and is visible to anyone viewing the file. The widget can update when any of those viewers interact with it; it can also be manually refreshed with updated details from another app or service.

#### REST API

**In any automated system:** A user sets up a pre-programmed routine or script that runs at a later time: either manually, on a set schedule (like a job that runs every night), or triggered by an event (like a build that runs whenever code files are changed). **Note:** Figma does not need to be open and a user does not need to be present.

**In [integrated apps](https://www.figma.com/product-integrations/):** A user has any an integrated app (e.g. Slack / Storybook / Notion / Maze / etc.) open and is either (a) looking at a live embed of a Figma design or FigJam file or (b) pulling details from a Figma design or FigJam file into the app for further processing, like creating a prototype from designs or pulling design details into a live design system.

**In Figma, via a plugin or widget:** A user running a plugin or widget (using the Plugin and Widget APIs) can also call the REST API to access contents of files other than the file where the plugin or widget is running.

### Example scenarios

#### Plugin API

**Bring content into Figma:** Interactively browse content from another source (like [Unsplash](https://www.figma.com/community/plugin/738454987945972471/Unsplash) or [LottieFiles](https://www.figma.com/community/plugin/809860933081065308/LottieFiles)) and easily add it to your Figma design

**Create shared workflows that involve Figma and other tools:** Minimize context switching by bringing key context and actions (like viewing or creating a [Jira](https://www.figma.com/community/plugin/1220802563996996107/Jira) ticket) into the Figma experience where you're already working

**Bring designs to code:** Transform Figma designs into working code in real time, like [Anima](https://www.figma.com/community/plugin/857346721138427857/Anima---Figma-to-React-and-HTML) or [LottieFiles](https://www.figma.com/community/plugin/809860933081065308/LottieFiles)

#### Widget API

**Enable real-time interactivity:** Drive alignment with voting, have fun with games, and more - right on the canvas where everyone can see

**Bring context from other tools onto the canvas:** Enable viewers of a Figma design or FigJam file to see relevant context from another app (like a row from a Coda or Notion table) directly on the canvas

**Add notes and annotations:** Add markup or context to a Figma design or FigJam file in exactly the format and UI that viewers will expect

**Start with rich, interactive templates:** Start off common projects like creating a table, building a timeline, or assembling a project board with smart templates that can react to the user's changes

#### REST API

**Build an integration:** [Integration partners](https://www.figma.com/product-integrations/) or Enterprise customers can leverage the REST API to build experiences enriched with Figma data and embeds in their own apps

**Sync Figma and your codebase:** Enterprises use the REST API to sync changes from their Figma design libraries to their codebase's design systems (and vice versa)

**Access details of other files from a plugin:** Plugins that want to compare the contents of the file in which they're running with other files, like linters, can access other files using the REST API

### Advantages

#### Plugin API

- Allows real-time changes to the contents of a Figma design or FigJam file
- Allows editing almost any aspect of a Figma design or FigJam file

#### Widget API

- Allow you to create rich and interactive multiplayer experiences directly on the canvas

#### REST API

- Allows other systems (e.g. apps like Notion, build systems like GitHub Actions, custom automations and scripts on a power user's local computer) to read the contents of one or many Figma design and/or FigJam files, even without having Figma open
- Better for accessing a large quantity of nodes (design items) in a single file and for accessing nodes from many files
- When using a user's Personal Access Token to call the API, can access all files that a user can access
- When registered as an OAuth app, any user can give the app permission to access all of their files

### Limitations

#### Plugin API

- Can only read and edit the current file that a user has open in Figma
- Cannot work across multiple files unless the user manually triggers the plugin on each file or the plugin code also calls the REST API

#### Widget API

- Can only read and edit the current file that a user has open in Figma
- Cannot work across multiple files; each instance of a widget acts only on the file where it's inserted

#### REST API

- Is largely read-only, with the exception of:
  - [Comments](docs/rest-api/comments-endpoints.md#post-comments-endpoint) and [Comment Reactions](docs/rest-api/comments-endpoints.md#post-comment-reactions-endpoint)
  - [Variables](docs/rest-api/variables-endpoints.md)
  - [Dev Resources](docs/rest-api/dev-resources-endpoints.md)
