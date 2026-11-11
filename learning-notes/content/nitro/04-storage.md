---
title: "Nitro 键值存储（KV Storage）"
description: "Nitro 提供内置存储层，可抽象文件系统、数据库或任意其他数据源。"
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/storage"
---

Nitro 内置集成 [unstorage](https://unstorage.unjs.io)，提供与运行时无关的持久化层。

## 用法

要使用存储层，可用 `useStorage()` 工具函数获取存储实例。

```ts
import { useStorage } from "nitro/storage";

// 默认存储（内存中）
await useStorage().setItem("test:foo", { hello: "world" });
const value = await useStorage().getItem("test:foo");

// 可用 useStorage(base) 指定基础前缀
const testStorage = useStorage("test");
await testStorage.setItem("foo", { hello: "world" });
await testStorage.getItem("foo"); // { hello: "world" }

// 可用泛型标注返回值类型
await useStorage<{ hello: string }>("test").getItem("foo");
await useStorage("test").getItem<{ hello: string }>("foo");
```

### 可用方法

`useStorage()` 返回的存储实例提供以下方法：

| 方法 | 说明 |
|---|---|
| `getItem(key)` | 获取某个键的值。键不存在时返回 `null`。 |
| `getItems(items)` | 一次获取多个条目。接受键数组或 `{ key, options }` 对象数组。 |
| `getItemRaw(key)` | 不解析地获取某个键的原始值，适用于二进制数据。 |
| `setItem(key, value)` | 设置某个键的值。 |
| `setItems(items)` | 一次设置多个条目。接受 `{ key, value }` 对象数组。 |
| `setItemRaw(key, value)` | 不序列化地设置某个键的原始值。 |
| `hasItem(key)` | 检查键是否存在，返回布尔值。 |
| `removeItem(key)` | 从存储中移除某个键。 |
| `getKeys(base?)` | 获取所有键，可按基础前缀过滤。 |
| `clear(base?)` | 清空所有键，可按基础前缀过滤。 |
| `getMeta(key)` | 获取某个键的元数据（如 `mtime`、`atime`、`ttl`）。 |
| `setMeta(key, meta)` | 设置某个键的元数据。 |
| `removeMeta(key)` | 移除某个键的元数据。 |
| `mount(base, driver)` | 在基础路径上动态挂载存储驱动。 |
| `unmount(base)` | 从基础路径卸载存储驱动。 |
| `watch(callback)` | 监听变更。回调接收 `(event, key)`。 |
| `unwatch()` | 停止监听变更。 |

也可使用简写别名：`get`、`set`、`has`、`del`、`remove`、`keys`。

```ts
import { useStorage } from "nitro/storage";

// 获取某前缀下的所有键
const keys = await useStorage("test").getKeys();

// 检查键是否存在
const exists = await useStorage().hasItem("test:foo");

// 移除一个键
await useStorage().removeItem("test:foo");

// 获取原始二进制数据
const raw = await useStorage().getItemRaw("assets/server:image.png");

// 获取元数据（type、etag、mtime 等）
const meta = await useStorage("assets/server").getMeta("file.txt");
```

## 配置

你可以使用 `storage` 配置项挂载一个或多个自定义存储驱动（driver）。键为挂载点（mount point）名称，值为驱动名称及其配置。

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  storage: {
    redis: {
      driver: "redis",
      /* redis 连接器选项 */
    }
  }
})
```

随后即可通过 `useStorage("redis")` 使用 redis 存储。

### 开发期存储

使用 `devStorage` 配置项可在开发与预渲染阶段覆盖存储配置。当生产驱动在开发环境中不可用时，这很有用。

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

在开发模式下运行时，`devStorage` 的挂载会覆盖合并到 `storage` 的挂载之上。

## 内置挂载点

### `/assets`

服务器资源挂载在 `/assets` 基础路径下，提供对打包后服务器资源的只读访问。

```ts
import { useStorage } from "nitro/storage";

const content = await useStorage("assets/server").getItem("my-file.txt");
```

### 默认（内存中）

根存储（不带基础路径）默认使用内存驱动。此处存储的数据在重启后不会保留。

若要持久化数据，请使用 `storage` 配置项挂载带持久化后端的驱动（如 `fs`、`redis` 等）。

## 服务器资源

Nitro 允许你打包项目根目录下 `assets/` 目录中的文件。这些文件在运行时可通过 `assets/server` 存储挂载访问。

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

### 自定义资源目录

使用 `serverAssets` 配置项注册额外的资源目录：

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

### 资源元数据

服务器资源包含内容类型、ETag 和修改时间等元数据：

```ts
import { useStorage } from "nitro/storage";

const serverAssets = useStorage("assets/server");
const meta = await serverAssets.getMeta("image.png");
// { type: "image/png", etag: "\"...\"", mtime: "2024-01-01T00:00:00.000Z" }

const raw = await serverAssets.getItemRaw("image.png");
```

> 在开发环境中，服务器资源直接读自文件系统；在生产环境中，它们会被打包并内联进构建产物。

## 运行时配置

若挂载点配置要到运行时才能确定，Nitro 可在启动期间通过插件动态添加挂载点。

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
