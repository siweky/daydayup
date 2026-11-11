# 学习笔记站（Nuxt Content）

基于 Nuxt 4 + @nuxt/content v3 + Nitro 的个人学习笔记站，内容按「个人笔记 / Nuxt / Nitro / Python / AI Agent」五个分类组织，全部为 Markdown 文档。更多用法见 [Nuxt Content 文档](https://content.nuxt.com)。

## 安装依赖

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## 启动开发服务器

在 `http://localhost:3000/daydayup/` 启动开发服务器（站点配置了 `/daydayup/` 作为 baseURL）：

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## 生产构建

构建生产环境产物：

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

本地预览构建产物：

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

更多部署方式见 [Nuxt 部署文档](https://nuxt.com/docs/getting-started/deployment)。

## 新增一篇笔记

把 `.md` 文件放进 `content/<分类>/`，frontmatter 至少需要 `title`、`description`、`category`、`date`；正文从 `##` 开始（详情页会用它生成目录）。新增分类时还需要同步 `content.config.ts`、`app/pages/<分类>.vue`、导航与首页、管理页分类选项，以及 `server/api/files.get.ts` 与 `server/api/upload.post.ts` 的白名单。
