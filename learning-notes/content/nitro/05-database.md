---
title: "Database"
description: "Nitro provides a built-in and lightweight SQL database layer with support for SQLite, PostgreSQL, MySQL, and more."
category: "nitro"
date: "2026-07-01"
source: "https://nitro.build/guide/database"
---

# Database

Nitro provides a built-in and lightweight SQL database layer.

The default database connection is **preconfigured** with SQLite and works out of the box for development mode and any Node.js compatible production deployments. By default, data will be stored in `.data/db.sqlite`.

> **Important:** Database support is currently experimental. Refer to the [db0 issues](https://github.com/unjs/db0/issues) for status and bug reports.

To enable the database layer, you need to enable the experimental feature flag:

```ts
// nitro.config.ts
import { defineConfig } from "nitro";

export default defineConfig({
  experimental: {
    database: true
  }
})
```

> You can change the default connection or define more connections to any of the supported databases. You can also integrate the database instance with any of the supported ORMs.

## Usage

```ts
// server.ts
import { defineHandler } from "nitro";
import { useDatabase } from "nitro/database";

export default defineHandler(async () => {
  const db = useDatabase();

  // Create users table
  await db.sql`DROP TABLE IF EXISTS users`;
  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" TEXT PRIMARY KEY, "firstName" TEXT, "lastName" TEXT, "email" TEXT)`;

  // Add a new user
  const userId = String(Math.round(Math.random() * 10_000));
  await db.sql`INSERT INTO users VALUES (${userId}, 'John', 'Doe', '')`;

  // Query for users
  const { rows } = await db.sql`SELECT * FROM users WHERE id = ${userId}`;

  return {
    rows,
  };
});
```

### `useDatabase`

Use `useDatabase` to get a database instance. It accepts an optional connection name (defaults to `"default"`).

```ts
import { useDatabase } from "nitro/database";

// Use the default connection
const db = useDatabase();

// Use a named connection
const usersDb = useDatabase("users");
```

> When `experimental.database` is enabled, `useDatabase` is auto-imported and available without an explicit import statement.

Database instances are created lazily on first use and cached for subsequent calls with the same connection name. If a connection name is not configured, an error will be thrown.

### `db.sql`

Execute SQL queries using tagged template literals with automatic parameter binding:

```ts
const db = useDatabase();

// Insert with parameterized values (safe from SQL injection)
const id = "1001";
await db.sql`INSERT INTO users VALUES (${id}, 'John', 'Doe', 'john@example.com')`;

// Query with parameters
const { rows } = await db.sql`SELECT * FROM users WHERE id = ${id}`;

// Result includes rows, changes count, and last insert ID
const result = await db.sql`INSERT INTO posts (title) VALUES (${"Hello"})`;
// result.rows, result.changes, result.lastInsertRowid
```

### `db.exec`

Execute a raw SQL string directly:

```ts
const db = useDatabase();

await db.exec("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT)");
```

### `db.prepare`

Prepare an SQL statement for repeated execution:

```ts
const db = useDatabase();

const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const result = await stmt.bind("1001").all();
```

## Configuration

You can configure database connections using `database` config:

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

### Development Database

Use the `devDatabase` config to override the database configuration **only for development mode**. This is useful for using a local SQLite database during development while targeting a different database in production.

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

> When `experimental.database` is enabled and no `database` or `devDatabase` config is provided, Nitro automatically configures a default SQLite connection. In development mode, data is stored relative to the project root directory.

## Connectors

Nitro supports all [db0 connectors](https://db0.unjs.io/connectors). The `connector` field accepts any of the following:

| Connector | Description |
|---|---|
| `sqlite` | Node.js built-in SQLite (alias for `node-sqlite`) |
| `node-sqlite` | Node.js built-in SQLite |
| `better-sqlite3` | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| `sqlite3` | [sqlite3](https://github.com/TryGhost/node-sqlite3) |
| `bun` / `bun-sqlite` | Bun built-in SQLite |
| `libsql` / `libsql-node` | libSQL (Node.js) |
| `libsql-http` | libSQL over HTTP |
| `libsql-web` | libSQL for web environments |
| `postgresql` | PostgreSQL |
| `mysql2` | MySQL |
| `pglite` | PGlite (embedded PostgreSQL) |
| `planetscale` | PlanetScale serverless |
| `cloudflare-d1` | Cloudflare D1 |
| `cloudflare-hyperdrive-mysql` | Cloudflare Hyperdrive with MySQL |
| `cloudflare-hyperdrive-postgresql` | Cloudflare Hyperdrive with PostgreSQL |
