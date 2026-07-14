---
title: "Plugins"
description: "Use plugins to extend Nitro's runtime behavior and hook into lifecycle events."
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/plugins"
---

# Plugins

Nitro plugins are **executed once** during server startup in order to allow extending Nitro's runtime behavior. They receive `nitroApp` context, which can be used to hook into lifecycle events.

Plugins are auto-registered from the `plugins/` directory and run synchronously by file name order on the first Nitro initialization. Plugin functions themselves must be synchronous (return `void`), but the hooks they register can be async.

```ts
// plugins/test.ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  console.log('Nitro plugin', nitroApp)
})
```

If you have plugins in another directory, you can use the `plugins` option:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  plugins: ['my-plugins/hello.ts']
})
```

## The `nitroApp` Context

The plugin function receives a `nitroApp` object with the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `hooks` | `HookableCore` | Hook system for registering lifecycle callbacks. |
| `h3` | `H3Core` | The underlying H3 application instance. |
| `fetch` | `(req: Request) => Response \| Promise<Response>` | The app's internal fetch handler. |
| `captureError` | `(error: Error, context) => void` | Programmatically capture errors into the error hook pipeline. |

## Nitro Runtime Hooks

You can use Nitro hooks to extend the default runtime behaviour by registering custom functions to lifecycle events within plugins.

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    // Will run when nitro is being closed
  });
})
```

### Available Hooks

| Hook | Signature | Description |
| --- | --- | --- |
| `request` | `(event: HTTPEvent) => void \| Promise<void>` | Called at the start of each request. |
| `response` | `(res: Response, event: HTTPEvent) => void \| Promise<void>` | Called after the response is created. |
| `error` | `(error: Error, context) => void` | Called when an error is captured. |
| `close` | `() => void` | Called when the Nitro server is shutting down. |

> The `NitroRuntimeHooks` interface is augmentable. Deployment presets (such as Cloudflare) can extend it with platform-specific hooks like `cloudflare:scheduled` and `cloudflare:email`.

### Unregistering Hooks

The `hook()` method returns an unregister function that can be called to remove the hook:

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  const unregister = nitroApp.hooks.hook("request", (event) => {
    // ...
  });

  // Later, remove the hook
  unregister();
});
```

## Examples

### Capturing Errors

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error, { event }) => {
    console.error(`${event?.path} Application error:`, error)
  });
})
```

The `context` object includes an optional `tags` array that identifies the error source (e.g., `"request"`, `"response"`, `"cache"`, `"plugin"`, `"unhandledRejection"`, `"uncaughtException"`).

### Programmatic Error Capture

Use `captureError` to manually feed errors into the error hook pipeline:

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.captureError(new Error("something went wrong"), {
    tags: ["startup"],
  });
});
```

### Graceful Shutdown

```ts
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    // Clean up resources, close connections, etc.
  });
});
```

### Request and Response Lifecycle

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

### Modifying Response Headers

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
