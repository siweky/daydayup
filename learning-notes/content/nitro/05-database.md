---
title: "内置 SQL 数据库（Database）"
description: "Nitro 提供内置轻量级 SQL 数据库层，支持 SQLite、PostgreSQL、MySQL 等。"
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/database"
---

Nitro 提供内置的轻量级 SQL 数据库层（SQL database layer）。

默认数据库连接已 **预配置** 为 SQLite，在开发模式及任意兼容 Node.js 的生产部署中开箱即用。数据默认存储于 `.data/db.sqlite`。

> **重要：** 数据库支持目前处于实验阶段。状态与缺陷报告请参阅 [db0 issues](https://github.com/unjs/db0/issues)。

要启用数据库层，需开启实验性功能标志：

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  experimental: {
    database: true
  }
})
```

> 你可以更改默认连接，或为任一受支持的数据库定义更多连接。也可以把数据库实例与任一受支持的 ORM 集成。

## 用法

```ts
// server.ts
import { defineHandler } from "nitro";
import { useDatabase } from "nitro/database";

export default defineHandler(async () => {
  const db = useDatabase();

  // 创建 users 表
  await db.sql`DROP TABLE IF EXISTS users`;
  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" TEXT PRIMARY KEY, "firstName" TEXT, "lastName" TEXT, "email" TEXT)`;

  // 添加一个新用户
  const userId = String(Math.round(Math.random() * 10_000));
  await db.sql`INSERT INTO users VALUES (${userId}, 'John', 'Doe', '')`;

  // 查询用户
  const { rows } = await db.sql`SELECT * FROM users WHERE id = ${userId}`;

  return {
    rows,
  };
});
```

### `useDatabase`

使用 `useDatabase` 获取数据库实例。它接受可选的连接名（默认 `"default"`）。

```ts
import { useDatabase } from "nitro/database";

// 使用默认连接
const db = useDatabase();

// 使用命名连接
const usersDb = useDatabase("users");
```

> 启用 `experimental.database` 后，`useDatabase` 会被自动导入，无需显式 import 语句即可使用。

数据库实例在首次使用时惰性创建，并对同名连接的后续调用进行缓存。若连接名未配置，将抛出错误。

### `db.sql`

使用带自动参数绑定的标签模板字面量执行 SQL 查询：

```ts
const db = useDatabase();

// 使用参数化值插入（防 SQL 注入）
const id = "1001";
await db.sql`INSERT INTO users VALUES (${id}, 'John', 'Doe', 'john@example.com')`;

// 带参数查询
const { rows } = await db.sql`SELECT * FROM users WHERE id = ${id}`;

// 结果包含 rows、变更数与最后插入 ID
const result = await db.sql`INSERT INTO posts (title) VALUES (${"Hello"})`;
// result.rows, result.changes, result.lastInsertRowid
```

### `db.exec`

直接执行原生 SQL 字符串：

```ts
const db = useDatabase();

await db.exec("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT)");
```

### `db.prepare`

预编译 SQL 语句以便重复执行：

```ts
const db = useDatabase();

const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const result = await stmt.bind("1001").all();
```

## 配置

可使用 `database` 配置来配置数据库连接：

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  database: {
    default: {
      connector: "sqlite",
      options: { name: "db" }
    },
    users: {
      connector: "postgresql",
      options: {
        url: "postgresql://username:password@hostname:port/database_name"
      },
    },
  },
});
```

### 开发期数据库

使用 `devDatabase` 配置 **仅在开发模式下** 覆盖数据库配置。这适用于开发时使用本地 SQLite 数据库、而生产环境面向另一种数据库的场景。

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  database: {
    default: {
      connector: "postgresql",
      options: {
        url: "postgresql://username:password@hostname:port/database_name"
      }
    }
  },
  devDatabase: {
    default: {
      connector: "sqlite",
      options: { name: "dev-db" }
    }
  }
});
```

> 启用 `experimental.database` 且未提供 `database` 或 `devDatabase` 配置时，Nitro 会自动配置默认的 SQLite 连接。在开发模式下，数据存储在项目根目录的相对路径下。

## 连接器

Nitro 支持所有 [db0 connectors](https://db0.unjs.io/connectors)。`connector` 字段可接受以下任一连接器（connector）值：

| 连接器 | 说明 |
|---|---|
| `sqlite` | Node.js 内置 SQLite（`node-sqlite` 的别名） |
| `node-sqlite` | Node.js 内置 SQLite |
| `better-sqlite3` | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| `sqlite3` | [sqlite3](https://github.com/TryGhost/node-sqlite3) |
| `bun` / `bun-sqlite` | Bun 内置 SQLite |
| `libsql` / `libsql-node` | libSQL（Node.js） |
| `libsql-http` | 基于 HTTP 的 libSQL |
| `libsql-web` | 面向 Web 环境的 libSQL |
| `postgresql` | PostgreSQL |
| `mysql2` | MySQL |
| `pglite` | PGlite（嵌入式 PostgreSQL） |
| `planetscale` | PlanetScale 无服务器 |
| `cloudflare-d1` | Cloudflare D1 |
| `cloudflare-hyperdrive-mysql` | 搭配 MySQL 的 Cloudflare Hyperdrive |
| `cloudflare-hyperdrive-postgresql` | 搭配 PostgreSQL 的 Cloudflare Hyperdrive |
