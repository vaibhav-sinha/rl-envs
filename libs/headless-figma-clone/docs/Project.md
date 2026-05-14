# Headless Figma Clone

We are trying to create a headless clone of Figma, which when accessed through the plugin api using an embedded mcp server, would behave similarly to actual Figma.

However, we do not need to implement the design editing UI like in Figma. The only way to read or write data is through the plugin api.

The implementation does not need to be canvas or webgl based either. Instead, as the writes are done, we should just keep on creating a metadata tree in json and persist it to a file on disk on edits.

When we want to export a frame or design as screenshot, that is when we can render the metadata tree. However, the rendering should happen by converting it to HTML/CSS and opening it in a headless chrome browser using playwright and taking the node screenshot.

In this implementation, we only want to deal with Figma Design and ignore everything else like Figjam, Figma Make, etc,

When we run it, it should start a embedded http server. That http server will host a MCP server and we can also host other endpoints. To begin with we can make it also serve /health endpoint.

The entire implementation will be in typescript using nodejs.

We have to break down the implementation into several phases. In the first phase, we just want the setup to be up and running and accessible. The figma plugin api support can be very minimal at this stage, maybe just comprising the ability to create a frame, add border and bg color. The MCP can just allow tools for use_figma, get_design_context and get_screenshot.

The two primary reference docs are: C:\Users\vaibh\Documents\Work\Products\rl-envs\libs\headless-figma-clone\docs\figma-plugin-api\docs\plugins
C:\Users\vaibh\Documents\Work\Products\rl-envs\libs\headless-figma-clone\docs\figma-plugin-api\docs\figma-mcp-server

Specifically, for MCP, this is the main doc: C:\Users\vaibh\Documents\Work\Products\rl-envs\libs\headless-figma-clone\docs\figma-plugin-api\docs\figma-mcp-server\tools-and-prompts.md

For MCP too, we do not need to support stuff like Code Connect. The tools to support are:

- create_new_file
- get_design_context (this can just return the generated html and css)
- get_metadata
- get_screenshot
- get_variable_defs
- search_design_system
- use_figma
- upload_assets

The actual clone should just be enough to support these.

Ignore the rest of the docs like those for REST API and all. We do not need to support anything else.

The MCP implementation should be done by using https://github.com/modelcontextprotocol/typescript-sdk