---
title: "Nuxt 安装与项目初始化"
description: "介绍如何通过在线演练场或本地命令行工具初始化 Nuxt 应用。"
category: "nuxt"
date: "2026-07-01"
source: "https://nuxt.com/docs/getting-started/installation"
---

通过浏览器中的在线沙箱（sandbox），或在终端里搭建本地环境，快速开始使用 Nuxt。

## 在线体验

如果希望不做任何本地配置、直接在浏览器里试验，可以使用在线沙箱。StackBlitz 提供了带代码编辑器与终端访问的演练场。

## 新建项目

### 前置条件

开始之前，请确认已具备以下条件：

- **Node.js**：需要 `22.x` 或更高版本，强烈建议使用当前活跃的 LTS 版本，并始终选择偶数版本号。
- **文本编辑器**：装有官方 Vue 扩展的 Visual Studio Code 或 WebStorm 都提供出色的开箱即用支持。
- **终端**：执行框架命令所必需。

**补充配置说明：**

- **WSL**：Windows 用户若遇到热模块替换（HMR）缓慢，可考虑使用 Windows Subsystem for Linux。
- **Windows DNS**：为加快 Windows 上的浏览器加载，使用 `127.0.0.1` 代替 `localhost:3000`。

### 创建新项目

打开终端，按所用的包管理器（package manager）运行对应命令：

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

创建完成后，进入项目目录：

```bash
cd <project-name>
```

或直接在 VS Code 中打开：

```bash
code <project-name>
```

### 开发服务器

以开发模式启动应用：

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

浏览器窗口会自动打开本地开发 URL。

## 后续步骤

项目创建成功后，即可开始构建应用。进一步了解核心概念，加深对框架架构的理解。
