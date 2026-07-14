---
title: "KV Storage"
description: "Nitro provides a built-in storage layer that can abstract filesystem, database, or any other data source."
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/storage"
---

# KV Storage

Nitro has built-in integration with [unstorage](https://unstorage.unjs.io) to provide a runtime agnostic persistent layer.

## Usage

To use the storage layer, you can use the `useStorage()` utility to access the storage instance.

```ts
import { useStorage } from "nitro/storage";

// Default storage (in-memory)
await useStorage().setItem("test:foo", { hello: "world" });
const value = await useStorage().getItem("test:foo");

// You can specify a base prefix with useStorage(base)
const testStorage = useStorage("test");
await testStorage.setItem("foo", { hello: "world" });
await testStorage.getItem("foo"); // { hello: "world" }

// You can use generics to type the return value
await useStorage<{ hello: string }>("test").getItem("foo");
await useStorage("test").getItem<{ hello: string }>("foo");
```

### Available Methods

The storage instance returned by `useStorage()` provides the following methods:

| Method | Description |
|---|---|
| `getItem(key)` | Get the value of a key. Returns `null` if the key does not exist. |
| `getItems(items)` | Get multiple items at once. Accepts an array of keys or `{ key, options }` objects. |
| `getItemRaw(key)` | Get the raw value of a key without parsing. Useful for binary data. |
| `setItem(key, value)` | Set the value of a key. |
| `setItems(items)` | Set multiple items at once. Accepts an array of `{ key, value }` objects. |
| `setItemRaw(key, value)` | Set the raw value of a key without serialization. |
| `hasItem(key)` | Check if a key exists. Returns a boolean. |
| `removeItem(key)` | Remove a key from storage. |
| `getKeys(base?)` | Get all keys, optionally filtered by a base prefix. |
| `clear(base?)` | Clear all keys, optionally filtered by a base prefix. |
| `getMeta(key)` | Get metadata for a key (e.g., `mtime`, `atime`, `ttl`). |
| `setMeta(key, meta)` | Set metadata for a key. |
| `removeMeta(key)` | Remove metadata for a key. |
| `mount(base, driver)` | Dynamically mount a storage driver at a base path. |
| `unmount(base)` | Unmount a storage driver from a base path. |
| `watch(callback)` | Watch for changes. Callback receives `(event, key)`. |
| `unwatch()` | Stop watching for changes. |

Shorthand aliases are also available: `get`, `set`, `has`, `del`, `remove`, `keys`.

```ts
import { useStorage } from "nitro/storage";

// Get all keys under a prefix
const keys = await useStorage("test").getKeys();

// Check if a key exists
const exists = await useStorage().hasItem("test:foo");

// Remove a key
await useStorage().removeItem("test:foo");

// Get raw binary data
const raw = await useStorage().getItemRaw("assets/server:image.png");

// Get metadata (type, etag, mtime, etc.)
const meta = await useStorage("assets/server").getMeta("file.txt");
```

## Configuration

You can mount one or multiple custom storage drivers using the `storage` option. The key is the mount point name, and the value is the driver name and configuration.

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  storage: {
    redis: {
      driver: "redis",
      /* redis connector options */
    }
  }
})
```

Then, you can use the redis storage using the `useStorage("redis")` function.

### Development Storage

Use the `devStorage` option to override storage configuration during development and prerendering. This is useful when your production driver is not available in development.

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  storage: {
    db: {
      driver: "redis",
      host: "prod.example.com",
    }
  },
  devStorage: {
    db: {
      driver: "fs",
      base: "./.data/db"
    }
  }
})
```

When running in development mode, `devStorage` mounts are merged on top of `storage` mounts.

## Built-in Mount Points

### `/assets`

Server assets are mounted at the `/assets` base path. This provides read-only access to bundled server assets.

```ts
import { useStorage } from "nitro/storage";

const content = await useStorage("assets/server").getItem("my-file.txt");
```

### Default (in-memory)

The root storage (without a base path) uses an in-memory driver by default. Data stored here is not persisted across restarts.

To persist data, mount a driver with a persistent backend (e.g., `fs`, `redis`, etc.) using the `storage` configuration option.

## Server Assets

Nitro allows you to bundle files from an `assets/` directory at the root of your project. These files are accessible at runtime via the `assets/server` storage mount.

```
my-project/
  assets/
    data.json
    templates/
      welcome.html
  server/
    routes/
      index.ts
```

```ts
// server/routes/index.ts
import { useStorage } from "nitro/storage";

export default defineHandler(async () => {
  const serverAssets = useStorage("assets/server");

  const keys = await serverAssets.getKeys();
  const data = await serverAssets.getItem("data.json");
  const template = await serverAssets.getItem("templates/welcome.html");

  return { keys, data, template };
});
```

### Custom Asset Directories

Register additional asset directories using the `serverAssets` config option:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  serverAssets: [
    {
      baseName: "templates",
      dir: "./templates",
    }
  ]
})
```

### Asset Metadata

Server assets include metadata such as content type, ETag, and modification time:

```ts
import { useStorage } from "nitro/storage";

const serverAssets = useStorage("assets/server");
const meta = await serverAssets.getMeta("image.png");
// { type: "image/png", etag: "\"...\"", mtime: "2024-01-01T00:00:00.000Z" }

const raw = await serverAssets.getItemRaw("image.png");
```

> In development, server assets are read directly from the filesystem. In production, they are bundled and inlined into the build output.

## Runtime Configuration

In scenarios where the mount point configuration is not known until runtime, Nitro can dynamically add mount points during startup using plugins.

```ts
// plugins/storage.ts
import { useStorage } from "nitro/storage";
import { definePlugin } from "nitro";
import redisDriver from "unstorage/drivers/redis";

export default definePlugin(() => {
  const storage = useStorage()

  const driver = redisDriver({
    base: "redis",
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  })

  storage.mount("redis", driver)
})
```
