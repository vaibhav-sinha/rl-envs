<!-- source: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts -->

- Figma MCP Server
- Core server features
- Tools and prompts

On this page

The Figma MCP server provides the following tools:

- [`add_code_connect_map`](#add_code_connect_map): Adds a mapping between a Figma node ID and its corresponding code component in your codebase
- [`create_new_file`](#create_new_file) (remote only): Creates a new blank Figma Design or FigJam file in the authenticated user's drafts
- [`generate_diagram`](#generate_diagram) (remote only): Generates a FigJam diagram from Mermaid syntax
- [`generate_figma_design`](#generate_figma_design) (specific clients only, remote only): Generates design layers from interfaces
- [`get_code_connect_map`](#get_code_connect_map): Retrieves a mapping between Figma node IDs and their corresponding code components in your codebase
- [`get_code_connect_suggestions`](#get_code_connect_suggestions): A Figma-prompted tool call to find suggestions for mapping Figma node IDs to their corresponding code components in your codebase using Code Connect
- [`get_context_for_code_connect`](#get_context_for_code_connect) (remote only): A Figma-prompted tool call to get context for generating Code Connect templates
- [`get_design_context`](#get_design_context): Get the design context for a layer or selection
- [`get_figjam`](#get_figjam): Converts FigJam diagrams (such as app architecture workflows) to XML
- [`get_libraries`](#get_libraries) (remote only): Returns the libraries currently added to the file (subscribed) and libraries available to add (community UI kits and org libraries)
- [`get_metadata`](#get_metadata): Returns a sparse XML representation of your selection that contains basic properties such as layer IDs, names, types, position and sizes
- [`get_screenshot`](#get_screenshot): Allows the agent to take a screenshot of your selection
- [`get_variable_defs`](#get_variable_defs): Returns the variables and styles used in your Figma selection
- [`search_design_system`](#search_design_system) (remote only): Searches design libraries for components, variables, and styles matching a text query
- [`send_code_connect_mappings`](#send_code_connect_mappings): A Figma-prompted tool used after calling `get_code_connect_suggestions` to confirm the suggested Code Connect mappings
- [`upload_assets`](#upload_assets) (remote only): Uploads supported assets (PNG, JPG, GIF, and WebP) to a Figma file
- [`use_figma`](#use_figma) (remote only): The general-purpose tool for creating, editing, or inspecting any object in a Figma file
- [`whoami`](#whoami-remote-only) (remote only): Returns the identity of the user that's authenticated to Figma

## add\_code\_connect\_map[​](#add_code_connect_map "Direct link to add_code_connect_map")

**Supported file types:** Figma Design

Adds a mapping between a Figma node ID and its corresponding code component in your codebase. Setting up these mappings will improve the output quality of design-to-code worksflows and help you identify and use the exact component in your project.

## create\_new\_file (remote only)[​](#create_new_file "Direct link to create_new_file (remote only)")

**Supported file types:** No file context required

Creates a new blank Figma Design or FigJam file in your drafts folder. If you belong to multiple plans, you'll be asked which team or organization to create the file in.

**You can ask it to:**

- **Create a new design file**
  - `create a new Figma file called "Homepage Redesign"`
- **Create a new FigJam file**
  - `create a new FigJam board for our project planning session`

## generate\_diagram (remote only)[​](#generate_diagram "Direct link to generate_diagram (remote only)")

note

**Note:** We're quickly improving how Figma supports AI agents. This will eventually be a usage-based paid feature, but is currently available for free during the beta period.

**Supported file types:** No file context required

Generates a FigJam diagram from Mermaid syntax or natural language descriptions. The `generate_diagram` tool converts structured or inferred diagram definitions into interactive FigJam diagrams that can be edited and shared.

You do not have to provide Mermaid syntax yourself. You can describe the diagram you want in natural language, and the agent will generate the appropriate Mermaid syntax and call the `generate_diagram` tool automatically.

Diagrams can be created in a new FigJam file or added to an existing FigJam file.

To ensure that the agent uses the Figma MCP `generate_diagram` tool, you can include the directive "Use the Figma MCP generate\_diagram tool" in your prompt. In most cases, the agent will invoke the tool automatically when a diagram is needed.

**Supported diagram types:**

- Flowchart
- Gantt chart
- State diagram
- Sequence diagram
- Architecture diagram
- Entity Relationship Diagram (ERD)

**Suggested prompts:**

- **Generate a diagram from a description**
  - `create a flowchart for the user authentication flow using the Figma MCP generate_diagram tool`
  - `generate a gantt chart for the project timeline using the Figma MCP generate_diagram tool`
  - `generate a sequence diagram for the payment processing system using the Figma MCP generate_diagram tool`
  - `generate an ERD for a blog database with users, posts, and comments using the Figma MCP generate_diagram tool`
  - `generate an architecture diagram for a real-time chat system using the Figma MCP generate_diagram tool`
- **Convert existing Mermaid syntax**
  - `create a diagram from this mermaid syntax: ...`

## generate\_figma\_design (remote only)[​](#generate_figma_design "Direct link to generate_figma_design (remote only)")

note

**Note**:

- For use with [select MCP clients](code-to-canvas.md).
- Remote Figma MCP server only.
- This tool is exempt from the standard rate limits for the Figma MCP server.

**Supported file types:** Figma Design

For detailed instructions, see [Code to canvas](code-to-canvas.md).

`generate_figma_design` lets you prompt your MCP client to send live UI for your web apps and sites as design layers to:

- New Figma Design files
- Existing Figma Design files
- Your clipboard

`generate_figma_design` respects your seat type when creating or editing files. New files are created in your team or organization drafts. For existing files, you must have edit permissions for the file.

## get\_code\_connect\_map[​](#get_code_connect_map "Direct link to get_code_connect_map")

**Supported file types:** Figma Design

Retrieves a mapping between selected Figma instance node IDs and their corresponding Code Connect components in your codebase.

It returns an object where each key is a Figma node ID (an instance in the current selection), and the value contains metadata about the connected component, such as:

- `componentName`: The name of the component in your codebase.
- `source`: The location of the component in your codebase (file path or URL).
- `snippet`, `snippetImports`, `snippetNestedFunctions`: Snippet data when available.
- `version`: The source of the mapping (for example, Code Connect UI vs Code Connect CLI).
- `label`: The framework label (for example, `React`) when available.

If multiple instances of the same component are selected, each instance appears as a separate entry. The mapping may also include nested components that have their own Code Connect mappings (for example, an icon inside a component).

On the remote server, you can use `clientFrameworks` and `clientLanguages` to control which Code Connect mappings are returned.

This mapping connects Figma design elements directly to their framework implementations, enabling design-to-code workflows and helping ensure the correct components are used for each part of the design.

## get\_code\_connect\_suggestions[​](#get_code_connect_suggestions "Direct link to get_code_connect_suggestions")

**Supported file types:** Figma Design

A tool call prompted by Figma to detect and suggest mappings of Figma components to code components in your codebase using Code Connect.

## get\_context\_for\_code\_connect (remote only)[​](#get_context_for_code_connect "Direct link to get_context_for_code_connect (remote only)")

**Supported file types:** Figma Design

A tool call prompted by Figma to retrieve context for generating Code Connect templates. Get structured component metadata including properties, variants, and descendant tree for a Figma component or component set. Returns property definitions with types and variant options, and a tree of descendant instances and text nodes with their property references.

Only intended for use with the figma-code-connect skill, not for direct invocation by a user.

## get\_design\_context[​](#get_design_context "Direct link to get_design_context")

**Supported file types:** Figma Design, Figma Make

Use the MCP server to get the [design context](server-returning-web-code.md#about-the-get_design_context-tool) for a layer or your selection in Figma. By default, the output is **React + Tailwind**, but you can customize it through your prompt.

**Suggested prompts:**

- **Change the framework**
  - `generate my Figma selection in Vue`
  - `generate my Figma selection in plain HTML + CSS`
  - `generate my Figma selection in iOS`
- **Use your components**
  - `generate my Figma selection using components from src/components/ui`
  - \*Tip: set up Code Connect for best code reuse results. Code Connect lets you set up multiple connections per Figma Library. You can map, for example, both your React and SwiftUI code to your Figma components. The Desktop MCP server will use the Code Connect mapping you have selected in Dev Mode. To control which Code Connect mappings are sent via the Remote MCP Server, instruct your agent to set the `clientFrameworks` tool call paramater to the exact Code Connect label you have set up for your mappings, e.g.. `React`, `SwiftUI`.
- **Combine both**
  - `generate my Figma selection using components from src/ui and style with Tailwind`

note

**Note:** Selection-based prompting only works with the desktop MCP server. The remote server requires a link to a frame or layer to extract context.

## get\_figjam[​](#get_figjam "Direct link to get_figjam")

**Supported file types:** FigJam

This tool returns metadata for FigJam diagrams in XML format, similar to `get_metadata`. In addition to returning basic properties like layer IDs, names, types, positions, and sizes, it also includes screenshots of the nodes.

## get\_libraries (remote only)[​](#get_libraries "Direct link to get_libraries (remote only)")

**Supported file types:** Figma Design

Get the design libraries associated with a Figma file. Returns two lists: libraries currently added to the file (subscribed), and libraries available to add (community UI kits and organization libraries). Each library includes its name, library key, description, and source type. The tool is used alongside `search_design_system`.

## get\_metadata[​](#get_metadata "Direct link to get_metadata")

**Supported file types:** Figma Design

Returns a sparse XML representation of your selection containing just basic properties such as the layer IDs, names, types, position and sizes. This is an outline that your Agent can then break down and call `get_design_context` on to retrieve only the styling information of the design it needs. Useful for very large designs where `get_design_context` produces output with a large context size. It also works with multiple selections or the whole page if you don't select anything.

## get\_screenshot[​](#get_screenshot "Direct link to get_screenshot")

**Supported file types:** Figma Design, FigJam

Allows the agent to take a screenshot of your selection. This helps preserve layout fidelity in the generated code. Recommended to keep on (only turn off if you're concerned about token limits).

## get\_variable\_defs[​](#get_variable_defs "Direct link to get_variable_defs")

**Supported file types:** Figma Design

Returns the variables and styles used in your Figma selection (such as colors, spacing, typography).

**You can ask it to:**

- **List all tokens used**
  - `get the variables used in my Figma selection`
- **Focus on a specific type**
  - `what color and spacing variables are used in my Figma selection?`
- **Get both names and values**
  - `list the variable names and their values used in my Figma selection`

## search\_design\_system (remote only)[​](#search_design_system "Direct link to search_design_system (remote only)")

**Supported file types:** Figma Design

Searches across all connected design libraries to find components, variables, and styles matching a text query. Returns matching assets so the agent can reuse existing design system elements rather than creating new ones from scratch.

**You can ask it to:**

- **Find components**
  - `search for a button component in my design system`
  - `find a card component I can use for this layout`
- **Look up tokens**
  - `search for the primary color variable in my design system`
  - `find spacing tokens in my design libraries`
- **Narrow by type**
  - `search for icon styles in my design system`

## send\_code\_connect\_mappings[​](#send_code_connect_mappings "Direct link to send_code_connect_mappings")

**Supported file types:** Figma Design

A tool call prompted by Figma to confirm the Code Connect mappings after calling `get_code_connect_suggestions`.

## upload\_assets (remote only)[​](#upload_assets "Direct link to upload_assets (remote only)")

**Supported file types:** Figma Design

Uploads assets (PNG, JPG, GIF, and WebP) into a Figma file. Can only be used with Figma Design files. Max 10MB per asset. If a URL to a specific node is provided, the image is uploaded as a fill to that node. Otherwise, new frames are created with the images as fills.

## use\_figma (remote only)[​](#use_figma "Direct link to use_figma (remote only)")

note

**Note:** We're quickly improving how Figma supports AI agents. This will eventually be a usage-based paid feature, but is currently available for free during the beta period.

**Supported file types:** Figma Design, FigJam

The general-purpose tool for writing to Figma files. Use it to create, edit, delete, or inspect objects in **Figma Design files** and **FigJam boards**.

In Figma Design files, `use_figma` can be used to work with pages, frames, components, variants, variables, styles, text, images, and more. In FigJam, it can be used to work with boards and objects like stickies, sections, connectors, shapes, tables, and code blocks.

When relevant, the agent will first check your design system or existing file content before creating anything from scratch.

The `use_figma` tool is best used with a skill:

- Use [`figma-use`](https://help.figma.com/hc/en-us/articles/39166810751895#h_01KMFHKFDR8Q78CR8CC9W8J18E) for Figma Design workflows
- Use [`figma-use-figjam`](https://help.figma.com/hc/en-us/articles/39166810751895-Figma-skills-for-MCP#h_01KMFHKFDR8Q78CR8CC9W8J18E) for FigJam workflows

**You can ask it to:**

- **Create or modify designs**
  - `add a new frame to my Figma file`
  - `update the button component to use the correct fill color`
- **Set up design tokens, variables, or styles**
  - `create a color variable collection from my design tokens`
  - `set up spacing tokens in my Figma file`
- **Build or update component and variant systems**
  - `generate variants for the card component`
  - `sync my Figma components with my latest code changes`
- **Fix layout or visual issues**
  - `fix the auto-layout spacing on the nav component`
  - `update the typography styles to match the design spec`
- **Create or update FigJam boards**
  - `organize this FigJam board into sections`
  - `add stickies and connectors to summarize this project brief`
  - `update this architecture diagram in FigJam with a new service`

## whoami (remote only)[​](#whoami-remote-only "Direct link to whoami (remote only)")

**Supported file types:** No file context required

This tool returns the identity of the user that's authenticated to Figma, including:

- The user's email address
- All of the plans the user belongs to
- The seat type the user has on each plan

[Previous

Set up the desktop server (using desktop app)](local-server-installation.md)[Next

Resources (Make → MCP)](bringing-make-context-to-your-agent.md)

- [add\_code\_connect\_map](#add_code_connect_map)
- [create\_new\_file (remote only)](#create_new_file)
- [generate\_diagram (remote only)](#generate_diagram)
- [generate\_figma\_design (remote only)](#generate_figma_design)
- [get\_code\_connect\_map](#get_code_connect_map)
- [get\_code\_connect\_suggestions](#get_code_connect_suggestions)
- [get\_context\_for\_code\_connect (remote only)](#get_context_for_code_connect)
- [get\_design\_context](#get_design_context)
- [get\_figjam](#get_figjam)
- [get\_libraries (remote only)](#get_libraries)
- [get\_metadata](#get_metadata)
- [get\_screenshot](#get_screenshot)
- [get\_variable\_defs](#get_variable_defs)
- [search\_design\_system (remote only)](#search_design_system)
- [send\_code\_connect\_mappings](#send_code_connect_mappings)
- [upload\_assets (remote only)](#upload_assets)
- [use\_figma (remote only)](#use_figma)
- [whoami (remote only)](#whoami-remote-only)
