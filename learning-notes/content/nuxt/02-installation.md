---
title: "Installation"
description: "How to initialize a Nuxt application using web-based playgrounds or local command-line tools."
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/getting-started/installation"
---

# Installation

Quickly begin your Nuxt journey using browser-based sandboxes or by setting up a local environment via your terminal.

## Play Online

If you prefer experimenting directly in your browser without any local setup, you can utilize an online sandbox. StackBlitz offers a playground featuring a code editor and terminal access.

## New Project

### Prerequisites

Before starting, ensure you have the following:

- **Node.js**: Version `22.x` or newer is required, though using the active LTS release is highly recommended. Always select an even-numbered version.
- **Text editor**: Visual Studio Code with the official Vue extension or WebStorm provide excellent out-of-the-box support.
- **Terminal**: Necessary for executing framework commands.

**Additional Setup Notes:**

- **WSL**: Windows users experiencing slow Hot Module Replacement should consider using the Windows Subsystem for Linux.
- **Windows DNS**: For faster browser loading on Windows, use `127.0.0.1` instead of `localhost:3000`.

### Create a New Project

Open your terminal and run the appropriate command for your package manager:

```bash
# npm
npm create nuxt@latest <project-name>

# yarn
yarn create nuxt <project-name>

# pnpm
pnpm create nuxt@latest <project-name>

# bun
bun create nuxt@latest <project-name>

# deno
deno -A npm:create-nuxt@latest <project-name>
```

After creation, navigate into your project directory:

```bash
cd <project-name>
```

Or open it directly in VS Code:

```bash
code <project-name>
```

### Development Server

Launch your application in development mode:

```bash
# npm
npm run dev -- -o

# yarn
yarn dev --open

# pnpm
pnpm dev -o

# bun
bun run dev -o

# deno
deno run dev -o
```

A browser window will automatically open to your local development URL.

## Next Steps

With your project successfully created, you are ready to build your application. Explore the core concepts to deepen your understanding of the framework's architecture.
