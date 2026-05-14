<!-- source: https://developers.figma.com/docs/code-connect/code-connect-ui-setup -->

- Code Connect
- Code Connect UI
- Getting Started with Code Connect UI

On this page

info

Available on a [Dev or Full seat](https://help.figma.com/hc/en-us/articles/360040328273-Seats-in-Figma#seat-types) on the [Organization, and Enterprise plans](https://www.figma.com/pricing/)

Requires a Figma library file with published design components

Code Connect UI lets you map design components in your Figma libraries to the corresponding code components in your repository. These mappings enhance the [Figma MCP server](../figma-mcp-server.md) by giving AI agents direct references to your code, enabling more accurate implementation guidance.

note

Components connected using Code Connect UI do not display code snippets in the Inspect panel. They currently show only the file and component name if provided, and support previews for AI-generated code snippets.
To display code snippets in Inspect, use [Code Connect CLI](quickstart-guide.md) instead.

---

## Connecting components from your design library[​](#connecting-components-from-your-design-library "Direct link to Connecting components from your design library")

1. In Figma, open a library file that contains design components.
2. Switch to **Dev Mode**.
3. From the dropdown menu next to the file name, choose **Library → Connect components to code**.

![Code Connect UI menu](/img/code-connect/code-connect-ui-menu.png)

The Code Connect UI opens and lists all **published** components from the library. From here, you can begin mapping components to your codebase.

![Code Connect UI](/assets/images/code-connect-ui-all-pages-7edbc3f81af5727870753dcef238c6fd.png)

### Connect your GitHub repository (optional)[​](#connect-your-github-repository-optional "Direct link to Connect your GitHub repository (optional)")

info

Connecting to GitHub is optional. You can map your design system components to code paths manually without a GitHub connection.

Click the **Settings** icon in the Code Connect UI to [connect your repository to GitHub](/docs/code-connect/code-connect-ui-github/).

Connecting to GitHub provides additional features:

- Mapping fields will autocomplete with file paths from your repository.
- You can browse and search for components directly from GitHub.

![Code Connect UI - connecting all buttons](https://static.figma.com/uploads/720092c03c3c9ff23b8cf2827c2a195c4b262c46)

### Manually connecting your components[​](#manually-connecting-your-components "Direct link to Manually connecting your components")

Without a GitHub connection you can still create mappings by manually entering:

- The component path in your codebase (e.g., `src/components/Button.tsx`)
- Optionally, the component name (e.g., `Button`)

All mappings are shared with the Figma MCP server. Whenever a mapped design component is used, its code context is included in the data sent to AI agents.

note

When working in your IDE, Code Connect can also provide inline suggestions (open beta) powered by the remote MCP server. These suggestions surface relevant component mappings and code updates in real time, helping you keep your design and code in sync.

---

## Connect components from a selected frame[​](#connect-components-from-a-selected-frame "Direct link to Connect components from a selected frame")

When you run the Figma MCP server on a selected frame, the quality of results depends on whether its design components are connected to code.

- If the frame contains **unmapped components**, the MCP server won't have complete context, and results may be less accurate.
- From **Dev Mode's inspect panel**, click **Connect components** to open the Code Connect UI. This allows you to connect missing components for the current frame.
- Once added, mappings are shared with the MCP server immediately and used as context, improving the accuracy of AI-generated results.

![Code Connect UI - enhanced MCP codegen](/assets/images/code-connect-ui-enhanced-codegen-3fd31b0e5bf9953f2977bf928620e6c9.png "Code Connect UI with enhanced MCP codegen")

---

## Connecting one component to multiple frameworks[​](#connecting-one-component-to-multiple-frameworks "Direct link to Connecting one component to multiple frameworks")

Code Connect UI supports **one-to-many connections**, allowing you to map a single design component to multiple code components across different languages or frameworks. For example, you can connect a `Button` design component to its React, SwiftUI, Jetpack Compose, and Vue implementations simultaneously.

This is useful when your design system ships components for multiple platforms. Each connection is independent, so you can specify different file paths, component names, and custom instructions per framework.

### Add multiple connections[​](#add-multiple-connections "Direct link to Add multiple connections")

1. In the Code Connect UI, scroll to the design component you wish to connect.
2. If the component has yet to be connected, connect it.
3. When hovering over the row for the component, an add button will appear allowing you to connect another code component.
4. Enter the file path and component name for the new code component (e.g., `src/components/Button.swift` for SwiftUI).
5. Repeat for each additional framework or language you want to connect.

![Code Connect UI - connecting all buttons](https://static.figma.com/uploads/7836082e8322790d34a5c2fed9e51a3a3210e76d)

---

## Add custom instructions for AI code generation[​](#add-custom-instructions-for-ai-code-generation "Direct link to Add custom instructions for AI code generation")

Once you've connected a component to your codebase, you can provide additional context to help AI agents generate better code. This is especially useful for components with specific usage patterns, accessibility requirements, or team conventions.

### Add instructions for MCP[​](#add-instructions-for-mcp "Direct link to Add instructions for MCP")

For any connected component, you can add custom instructions that will be used by your LLM via the Figma MCP server:

1. In the Code Connect UI, select a connected component.
2. Click the **Add instructions for MCP** button.
3. Write user prompts that describe how the component should be used, including:
   - Specific props or configuration patterns
   - Accessibility considerations
   - Common use cases or variations
   - Team-specific coding conventions

These instructions are sent along with your component mapping to the MCP server, helping the AI generate code that better matches your design system's implementation.

### Preview AI-generated code snippets[​](#preview-ai-generated-code-snippets "Direct link to Preview AI-generated code snippets")

To verify that your mappings and instructions will produce the right code, you can preview AI-generated snippets directly in the Code Connect UI:

1. Select a connected component in the Code Connect UI.
2. **Change the properties** of the design component to test different configurations (e.g., different button sizes, states, or variants).
3. View the **code snippet preview** to see what your LLM would generate based on:
   - The component mapping
   - Your custom MCP instructions
   - The current property values

This preview helps you refine your instructions and ensure that the AI will generate appropriate code for all variations of your component.

info

The preview snippets are generated in a different context than when the MCP server responds to actual requests. As a result, the code generated in the preview may differ slightly from what your LLM produces during real usage, where it has access to your full conversation history and additional context.

[Previous

Introduction](../code-connect.md)[Next

Connect to your GitHub repository](/docs/code-connect/code-connect-ui-github/)

- [Connecting components from your design library](#connecting-components-from-your-design-library)
  - [Connect your GitHub repository (optional)](#connect-your-github-repository-optional)
  - [Manually connecting your components](#manually-connecting-your-components)
- [Connect components from a selected frame](#connect-components-from-a-selected-frame)
- [Connecting one component to multiple frameworks](#connecting-one-component-to-multiple-frameworks)
  - [Add multiple connections](#add-multiple-connections)
- [Add custom instructions for AI code generation](#add-custom-instructions-for-ai-code-generation)
  - [Add instructions for MCP](#add-instructions-for-mcp)
  - [Preview AI-generated code snippets](#preview-ai-generated-code-snippets)
