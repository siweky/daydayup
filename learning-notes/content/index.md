# 欢迎使用 Nuxt Content 笔记站

这一页渲染的是 [`content/index.md`](https://github.com/nuxt/starter/blob/content/content/index.md) 里的 Markdown，用来演示 @nuxt/content 的页面渲染能力。站点的实际首页由 `app/pages/index.vue` 提供。

五个分类的内容都可以从顶部导航进入，笔记也能在 `/manage` 页面上传与删除。

## 管理内容

在 `content/` 目录下新建或修改 Markdown 文件，就能增删页面；也可以通过 `/manage` 页面上传、删除笔记。

## 查询与渲染页面

查询内容并渲染的示例见 [catch-all 页面](https://github.com/nuxt/starter/blob/content/app/pages/%5B...slug%5D.vue)，本站对应的是 `app/pages/[...slug].vue`。

## 在 Markdown 中使用 Vue 组件

::alert{color="green"}
下面这个 [alert](https://github.com/nuxt/starter/blob/content/app/components/Alert.vue) 与 [counter](https://github.com/nuxt/starter/blob/content/app/components/Counter.vue) 都是嵌进 Markdown 的 `Vue` 组件（MDC 语法）。
::

::counter
::

更多用法见 [@nuxt/content 文档](https://content.nuxt.com/docs/getting-started)。
