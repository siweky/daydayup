---
title: "插件与运行时钩子（Plugins）"
description: "使用插件扩展 Nitro 的运行时行为，并挂接到生命周期事件。"
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/plugins"
---

Nitro 插件（plugins）在服务器启动时 **执行一次**，用于扩展 Nitro 的运行时行为。它们接收 `nitroApp` 上下文，可借此挂接到生命周期事件。

插件从 `plugins/` 目录自动注册，在 Nitro 首次初始化时按文件名顺序同步执行。插件函数本身必须是同步的（返回 `void`），但其注册的钩子可以是异步的。

```ts
// plugins/test.ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  console.log('Nitro plugin', nitroApp)
})
```

若插件位于其他目录，可使用 `plugins` 配置项：

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  plugins: ['my-plugins/hello.ts']
})
```

## `nitroApp` 上下文

插件函数接收一个 `nitroApp` 对象，包含以下属性：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `hooks` | `HookableCore` | 用于注册生命周期回调的钩子系统。 |
| `h3` | `H3Core` | 底层 H3 应用实例。 |
| `fetch` | `(req: Request) => Response \| Promise<Response>` | 应用内部的 fetch 处理器。 |
| `captureError` | `(error: Error, context) => void` | 以编程方式将错误送入错误钩子管线。 |

## Nitro 运行时钩子

你可以在插件中把自定义函数注册到生命周期事件上，借助 Nitro 运行时钩子（hooks）扩展默认的运行时行为。

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    // nitro 关闭时运行
  });
})
```

### 可用钩子

| 钩子 | 签名 | 说明 |
| --- | --- | --- |
| `request` | `(event: HTTPEvent) => void \| Promise<void>` | 每个请求开始时调用。 |
| `response` | `(res: Response, event: HTTPEvent) => void \| Promise<void>` | 响应创建后调用。 |
| `error` | `(error: Error, context) => void` | 捕获到错误时调用。 |
| `close` | `() => void` | Nitro 服务器关闭时调用。 |

> `NitroRuntimeHooks` 接口可扩展。部署预设（如 Cloudflare）能用平台专属钩子为其扩充，例如 `cloudflare:scheduled` 和 `cloudflare:email`。

### 注销钩子

`hook()` 方法返回一个注销函数，调用它即可移除该钩子：

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  const unregister = nitroApp.hooks.hook("request", (event) => {
    // ...
  });

  // 稍后移除该钩子
  unregister();
});
```

## 示例

### 捕获错误

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error, { event }) => {
    console.error(`${event?.path} Application error:`, error)
  });
})
```

`context` 对象包含一个可选的 `tags` 数组，用于标识错误来源（例如 `"request"`、`"response"`、`"cache"`、`"plugin"`、`"unhandledRejection"`、`"uncaughtException"`）。

### 编程式捕获错误

使用 `captureError` 手动把错误送入错误钩子管线：

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.captureError(new Error("something went wrong"), {
    tags: ["startup"],
  });
});
```

### 优雅关闭

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    // 清理资源、关闭连接等。
  });
});
```

### 请求与响应生命周期

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    console.log("on request", event.path);
  });

  nitroApp.hooks.hook("response", (res, event) => {
    console.log("on response", res.status);
  });
});
```

### 修改响应头

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("response", (res, event) => {
    const { pathname } = new URL(event.req.url);
    if (pathname.endsWith(".css") || pathname.endsWith(".js")) {
      res.headers.append("Vary", "Origin");
    }
  });
});
```
