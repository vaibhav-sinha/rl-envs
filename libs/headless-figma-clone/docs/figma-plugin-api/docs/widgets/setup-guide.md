<!-- source: https://developers.figma.com/docs/widgets/setup-guide -->

- Widgets
- Getting Started
- Setup Guide

On this page

This short guide will walk you through the steps needed to setup your development environment for writing and creating a simple widget for FigJam. By the end of this guide, you will have a simple counter widget that records and displays the number of times people have clicked on it.

The setup for widget development is very similar to the set up for plugin development. **If you’re already familiar with Figma plugin development, feel free to skip to [Create a new widget](#create-a-new-widget), [Sample widgets](#sample-widgets), or [Building widgets from scratch](#building-widgets-from-scratch).**

## Installation[​](#installation "Direct link to Installation")

- **Visual Studio Code**: Visual Studio Code can be downloaded here: <https://code.visualstudio.com/>.
- **Node.js and NPM**: You can download Node.js here, which will include NPM: <https://nodejs.org/en/download/>.
- **Get the Figma desktop app**: At this time, widget development and testing needs to be done using the Figma desktop app. This is because Figma needs to read your code saved as a local file. The Figma desktop app can be downloaded here: <https://www.figma.com/downloads/>.

  If you already have the desktop app, please make sure to update to the latest version, as several features have been added specifically in order to provide a better widget development experience.

## Create a new widget[​](#create-a-new-widget "Direct link to Create a new widget")

1. Log in to your account and open the Figma desktop app
2. You can open any existing Figma / FigJam document or create a new one.
3. Go to Menu > Widgets > Development > New widget...

This will bring up the "Create widget" modal to create a starter widget. Give it a name, then choose "Simple widget" in the next screen. Save the widget anywhere on disk.

## Modify your widget[​](#modify-your-widget "Direct link to Modify your widget")

1. **Open the folder you just created using Visual Studio Code.** Widgets are defined using multiple files and you'll want to be able to edit them all of them, so one trick is to open the folder itself rather than any of the files inside it.
2. **Install the dependencies**: run `npm install`.

   We are installing typescript and both widget and plugin typings since a lot of the code you'll write inside of widgets will use the Figma plugin API as well as the widget API.
3. **Install the linter**

   Linting, the automated validation of source code for issues, can be very helpful for catching errors early in the development of your widget. Figma provides a set of [typescript-eslint rules](https://github.com/figma/eslint-plugin-figma-plugins?tab=readme-ov-file#eslint-plugin-figma-plugins) to help support widget development. These rules can identify, and in many cases automatically fix, issues in your widget code.

   To install and use the linter, follow the instructions in the [**Usage** section](https://github.com/figma/eslint-plugin-figma-plugins?tab=readme-ov-file#usage) of the README included with the linter rules. [Find the `eslint-plugin-figma-plugins` repository on GitHub →](https://github.com/figma/eslint-plugin-figma-plugins?tab=readme-ov-file)
4. **Set up TypeScript compilation**

   Compile TypeScript to JavaScript: Run the "Terminal > Run Build Task..." menu item, then select "npm: watch". This tells Visual Studio Code to compile your `widget-src/code.tsx` code into a `dist/code.js` file. It will watch for changes to `*.tsx` files and automatically re-generate `dist/code.js` each time. You will have to do this again every time you reopen Visual Studio Code.
5. **Insert your widget into the file**

   Inside your FigJam file, you should be able to Go to `Menu > Widgets > Development > {your_widget_name}` to insert your newly created widget. The sample widget should look like a simple counter.
6. **Make some test changes**

   Make some simple changes to `widget-src/code.tsx` to get familiar with Visual Studio Code (**not** code.**js** — that's generated and gets overwritten!).

That’s it! You are now ready to create your very own widget!

## Sample widgets[​](#sample-widgets "Direct link to Sample widgets")

If you understand the fundamentals of building widgets, or you learn best by example, you can explore these [widget samples on GitHub](https://github.com/figma/widget-samples).

## `@figma/create-widget`[​](#figmacreate-widget "Direct link to figmacreate-widget")

If you're already familiar with widgets, we also provide a single command to help you to get started:

```
npm init @figma/widget
```

## Building widgets from scratch[​](#building-widgets-from-scratch "Direct link to Building widgets from scratch")

If you’re building your widgets from scratch, here’s a sample tsconfig.json to get you started:

```
{  
   "compilerOptions": {  
      "jsx": "react",  
      "jsxFactory": "figma.widget.h",  
      "jsxFragmentFactory": "figma.widget.Fragment",  
      "target": "es6",  
      "strict": true,  
      "typeRoots": [  
         "./node_modules/@types",  
         "./node_modules/@figma"  
      ]  
   }  
}
```

You’ll also want to install widget and plugins typings from npm

```
npm install --save-dev @figma/widget-typings @figma/plugin-typings
```

[Previous

Prerequisites](prerequisites.md)[Next

Widgets vs Plugins](widgets-vs-plugins.md)

- [Installation](#installation)
- [Create a new widget](#create-a-new-widget)
- [Modify your widget](#modify-your-widget)
- [Sample widgets](#sample-widgets)
- [`@figma/create-widget`](#figmacreate-widget)
- [Building widgets from scratch](#building-widgets-from-scratch)
