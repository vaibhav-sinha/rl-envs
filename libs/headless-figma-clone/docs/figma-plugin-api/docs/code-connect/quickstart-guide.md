<!-- source: https://developers.figma.com/docs/code-connect/quickstart-guide -->

- Code Connect
- Code Connect CLI
- Getting started with Code Connect CLI

On this page

In this guide, we’ll get you set up with Code Connect CLI using **template files** — the recommended approach for connecting your design components to code. Template files are framework-agnostic and give you full control over the code snippets shown in Figma.

We’ll walk through:

1. [Install Code Connect CLI](#install-the-code-connect-command-line-tool)
2. [Configure your project](#configure-your-project)
3. [Write your first template file](#write-your-first-template-file)
4. [Publish to Figma](#publish-code-connect-files)
5. [Next steps](#next-steps)

### Before you begin[​](#before-you-begin "Direct link to Before you begin")

To use this guide, you need a design system codebase that contains components, and a Figma design library (a Figma file that contains your root design system components).

To follow along with the guide, you can optionally use the Simple Design System (SDS) provided by Figma. If you’d like to use the SDS:

1. Open the [Simple Design System community file](https://www.figma.com/community/file/1380235722331273046) in Figma and, when prompted, select **Make a copy**. The SDS community file contains the design system components.
2. Clone the [sds repository](https://github.com/figma/sds). The repository contains the code components that you’ll connect to your copy of the SDS file.

**Requirements**

To install and use Code Connect, you must do the following:

- Install [Node.js 18 or newer](https://nodejs.org/en/download/package-manager)
- [Generate a personal access token](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens) with the Code Connect scope set to **Write** and the File content scope set to **Read**.

### Install the Code Connect command line tool[​](#install-the-code-connect-command-line-tool "Direct link to Install the Code Connect command line tool")

To use Code Connect, you first need to install the Code Connect command line tool. The command line tool lets you connect, publish, and unpublish your components.

The easiest way to install the command line tool is with Node Package Manager (`npm`). To install the command line tool, use:

```
npm install --global @figma/code-connect@latest
```

### Privacy and Code Connect[​](#privacy-and-code-connect "Direct link to Privacy and Code Connect")

Figma only collects the minimum data needed to enable Code Connect in the interface. When you run `figma connect` using the Code Connect command-line interface, Figma gets the following data:

- The paths for components that are added
- The repository URL where the Code Connect components are implemented
- The properties and code in the .figma files

Figma logs only basic events for understanding Code Connect usage: when components are published or unpublished, and calls to get Figma data when using the command-line interface.

For more information about Figma’s approach to privacy, see Figma’s [Privacy Policy](https://www.figma.com/legal/privacy/).

### Configure your project[​](#configure-your-project "Direct link to Configure your project")

Create a `figma.config.json` file in the root of your project:

```
{  
  "codeConnect": {  
    "include": ["**/*.figma.ts"],  
    "label": "React",  
    "language": "jsx"  
  }  
}
```

The `label` and `language` values control how your snippets are labeled in Figma. Change these to match your codebase — for example, use `"Swift"` and `"swift"` for a SwiftUI project.

If you’re using TypeScript, add the template type definitions to your `tsconfig.json` for autocomplete and type checking in template files:

tsconfig.json

```
{  
  "compilerOptions": {  
    "types": ["@figma/code-connect/figma-types"]  
  }  
}
```

### Write your first template file[​](#write-your-first-template-file "Direct link to Write your first template file")

Template files connect a Figma component to a code snippet. They use the `.figma.ts` (or `.figma.js`) extension and live alongside your code components.

To connect a Figma component:

1. In Figma, right-click on the component and select **Copy link to selection** to get its URL.
2. Create a `.figma.ts` file for your component. The filename should match your component name, e.g. `Button.figma.ts`:

Button.figma.ts

```
// url=https://www.figma.com/file/your-file-id/Button?node-id=123  
import figma from 'figma'  
  
const instance = figma.selectedInstance  
  
const label = instance.getString('Label')  
const disabled = instance.getBoolean('Disabled')  
const size = instance.getEnum('Size', {  
  Large: 'large',  
  Medium: 'medium',  
  Small: 'small',  
})  
  
export default {  
  example: figma.code`  
    <Button size={${size}} disabled={${disabled}}>  
      ${label}  
    </Button>  
  `,  
  imports: ['import { Button } from "components/Button"'],  
  id: 'button',  
}
```

The file has three main parts:

- **Metadata comment** (`// url=...`): Links this file to a specific Figma component. The URL should point to the component in your design system file (right-click a component in Figma and select **Copy link to selection**).
- **Property access**: Use methods on `figma.selectedInstance` to read properties from the Figma component and map them to code values. Common methods include `getString`, `getBoolean`, `getEnum`, and `getInstanceSwap`.
- **`export default`**: Defines the code snippet (`example`), any import statements to display at the top of the snippet, and a unique `id` for this template.

For the complete template API including all available methods and advanced features, see [Writing template files](/docs/code-connect/template-files/).

### Publish Code Connect files[​](#publish-code-connect-files "Direct link to Publish Code Connect files")

To view the Code Connect snippets for your components in Dev Mode, you need to publish the files first:

1. In the root of your repository, run the following command using your personal access token:

```
npx figma connect publish --token=PERSONAL_ACCESS_TOKEN
```

Where `PERSONAL_ACCESS_TOKEN` is the access token for the Figma API that you generated.

note

**Note:** Optionally, you can use the `FIGMA_ACCESS_TOKEN` environment variable to pass your personal access token to the Code Connect command line tool. When using the env variable, you do not have to include `--token`.

The tool publishes your Code Connect files, returning a list of component names and URLs to the corresponding nodes.

2. To view the mapped components in Figma, click the links in the list after you publish. The links bring you to the corresponding components in your design system Figma file.
3. In the toolbar, click ![](data:image/png;base64,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) **Dev Mode**. The code snippet from Code Connect appears in the Inspect panel in the right sidebar.

![Example that shows the code snippet at the top of the Inspect panel](/assets/images/code-connect-code-snippet-3fc471f3bd6dc2872814f290705f0356.png)

### Unpublish Code Connect files[​](#unpublish-code-connect-files "Direct link to Unpublish Code Connect files")

If there are any issues with your mappings or you need to detach a component for any reason, you can unpublish a Code Connect file. To unpublish a file, use:

```
npx figma connect unpublish --node=NODE_URL --label=LABEL
```

Where `NODE_URL` is the URL of a specific node in your design system file, and [`label`](/docs/code-connect/api/config-file/#label) is the type to unpublish, e.g. "React" or "Vue".

important

**Important:** If you don’t specify a node URL, Code Connect will unpublish all of your components defined in your Code Connect files directory. If you ever have questions about other configurations that can be run, use the `--help` flag to list all the available flags.

## Next Steps[​](#next-steps "Direct link to Next Steps")

Now that you’ve published your first template file, here are some things to explore:

- **[Writing template files →](/docs/code-connect/template-files/)**: Learn the full template API, including nested components, conditional rendering, and more.
- **[Template API reference →](/docs/code-connect/template-api/)**: Complete reference for all available methods and types.
- **[Configuration →](/docs/code-connect/api/config-file/)**: Advanced configuration options for your `figma.config.json`.
- **Framework-specific APIs**: Code Connect also supports framework-specific integrations for [React (and React Native)](/docs/code-connect/react/), [HTML/Web Components](/docs/code-connect/html/), [SwiftUI](/docs/code-connect/swiftui/), and [Jetpack Compose](/docs/code-connect/compose/).

[Previous

Comparing Code Connect UI and Code Connect CLI](/docs/code-connect/comparing-cc/)[Next

Configuring your project](/docs/code-connect/api/config-file/)

- [Before you begin](#before-you-begin)
- [Install the Code Connect command line tool](#install-the-code-connect-command-line-tool)
- [Privacy and Code Connect](#privacy-and-code-connect)
- [Configure your project](#configure-your-project)
- [Write your first template file](#write-your-first-template-file)
- [Publish Code Connect files](#publish-code-connect-files)
- [Unpublish Code Connect files](#unpublish-code-connect-files)
- [Next Steps](#next-steps)
