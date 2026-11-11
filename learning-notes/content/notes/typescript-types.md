---
title: "TypeScript 类型系统进阶：从类型体操到工程实践"
description: "类型收窄、satisfies、条件类型分发、infer、键重映射、模块增强与类型性能，补齐常用工具类型之外的进阶知识"
category: "notes"
date: "2026-11-11"
---

> 基础工具类型（`Partial` / `Pick` / `Omit` / `Record`）和泛型入门见 [TypeScript 实用技巧](/notes/typescript-tips)。这一篇只讲那篇没有覆盖、但在真实项目里天天用到的部分。

## 一、类型收窄：让控制流替你做校验

TypeScript 会根据控制流自动收窄类型，理解它的边界比记住工具类型更重要。

```ts
function render(value: string | number | null) {
  if (value === null) return '空'
  // 此处 value: string | number
  if (typeof value === 'string') return value.toUpperCase()
  // 此处 value: number
  return value.toFixed(2)
}
```

### 可辨识联合与穷尽检查

用 `never` 让新增分支时编译器主动报错，这是最便宜的「防漏改」机制：

```ts
type Result =
  | { kind: 'ok'; data: string[] }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }

function assertNever(x: never): never {
  throw new Error(`未处理的分支: ${JSON.stringify(x)}`)
}

function describe(r: Result): string {
  switch (r.kind) {
    case 'ok': return `${r.data.length} 条`
    case 'loading': return '加载中'
    case 'error': return r.message
    default: return assertNever(r) // 以后新增 kind 而没改这里，编译报错
  }
}
```

### 断言函数与自定义类型守卫

```ts
function assertDefined<T>(v: T | undefined, name: string): asserts v is T {
  if (v === undefined) throw new Error(`${name} 不能为空`)
}

function isUser(v: unknown): v is { id: string; name: string } {
  return typeof v === 'object' && v !== null && 'id' in v && 'name' in v
}

const raw: unknown = await fetchSomething()
assertDefined(raw, 'raw')      // 之后 raw 不再是 undefined
if (isUser(raw)) console.log(raw.name) // 之后 raw 有具体形状
```

注意 `is` 只是**编译期承诺**，运行时不会自动校验。外部输入（接口、模型输出、localStorage）必须配运行时校验，见第六节。

## 二、satisfies、as const 与类型注解的区别

三者最容易混用，语义完全不同：

```ts
type Theme = Record<'light' | 'dark', { bg: string; fg: string }>

// 1. 类型注解：会「拓宽」字面量，丢失具体信息
const a: Theme = { light: { bg: '#fff', fg: '#000' }, dark: { bg: '#000', fg: '#fff' } }
//    a.light.bg 的类型是 string，不是 '#fff'

// 2. as const：把值冻结为最窄的字面量类型，但不做结构校验
const b = { light: { bg: '#fff' }, dark: { bg: '#000' } } as const
//    缺 fg 也不会报错

// 3. satisfies：既校验结构，又保留最窄的推断类型（推荐）
const c = {
  light: { bg: '#fff', fg: '#000' },
  dark:  { bg: '#000', fg: '#fff' },
} satisfies Theme
//    c.light.bg 的类型是 '#fff'，且少写 fg 会报错
```

实用场景：配置表、路由表、事件名映射、主题变量——既想要自动补全的字面量，又想保证字段齐全。

```ts
const ROUTES = {
  home: '/',
  notes: '/notes',
  aiAgent: '/ai-agent',
} as const

type RouteName = keyof typeof ROUTES          // 'home' | 'notes' | 'aiAgent'
type RoutePath = typeof ROUTES[RouteName]     // '/' | '/notes' | '/ai-agent'
```

## 三、条件类型：分发、never 与 infer

```ts
type IsString<T> = T extends string ? true : false
type A = IsString<'a'>            // true
type B = IsString<string | number> // boolean（true | false）——发生了「分发」
```

**分发条件**只在「裸类型参数」上发生。想关闭分发，用元组包一层：

```ts
type NoDistribute<T> = [T] extends [string] ? true : false
type C = NoDistribute<string | number> // false
```

两个高频坑：

```ts
type NonNullableBuiltin<T> = T extends null | undefined ? never : T
type D = NonNullableBuiltin<string | null> // string ✅

// never 在分发位置会让整个结果变成 never
type E = IsString<never> // never，不是 false
```

### infer：从类型里「抽」出一部分

```ts
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T
type ElementOf<T> = T extends (infer U)[] ? U : never
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never

type R = Awaited<Promise<Promise<number>>> // number（递归展开）
type P = FirstArg<(id: string, count: number) => void> // string
```

实战：给 API 客户端自动推导返回类型，避免手写两份类型。

```ts
async function request<T>(url: string): Promise<{ data: T; status: number }> { /* ... */ }
type Unwrap<T> = T extends Promise<{ data: infer D }> ? D : never
type User = Unwrap<ReturnType<typeof request<{ id: string }>>> // { id: string }
```

## 四、映射类型与键重映射

工具类型不是魔法，都是映射类型写出来的：

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }

// as 子句可以改写键名，也能过滤键
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}

type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
}

interface User { id: string; name: string; age: number }
type G = Getters<User>      // getId(): string; getName(): string; getAge(): number
type S = OnlyStrings<User>  // { id: string; name: string }（age 被过滤）
```

`as never` 过滤键这一招，在做「按字段类型生成表单配置」时非常好用。

## 五、递归类型、深度限制与类型性能

```ts
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }
```

类型体操不是免费的。遇到 `Type instantiation is excessively deep` 时：

- 给递归加深度计数器，超过 N 层就退化成 `any` 或 `unknown`
- 避免超大联合（几百个字面量）参与条件类型分发
- 优先用接口继承而非深层交叉类型 `A & B & C & ...`
- `tsc --noEmit --extendedDiagnostics` 看类型检查耗时，定位热点文件

## 六、声明合并与模块增强

给第三方库补类型，或给框架的配置对象加字段：

```ts
// index.d.ts —— 本站 nuxt.config 里的 runtimeConfig 就靠这个获得类型提示
declare module 'nuxt/schema' {
  interface RuntimeConfig {
    openaiApiKey: string
  }
  interface PublicRuntimeConfig {
    apiBase: string
  }
}
export {}
```

注意：文件必须在 `tsconfig` 的 include 范围内；`declare module` 里写的是「模块内已有接口的合并」，名字写错不会报错但也没效果——这是最常踩的静默失败。

### 别把类型系统当运行时校验

```ts
import { z } from 'zod'

const UserSchema = z.object({ id: z.string(), age: z.number().int().positive() })
type User = z.infer<typeof UserSchema> // 类型从校验规则推导，只有一份真相

function handle(input: unknown) {
  const parsed = UserSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues }
  return parsed.data // 此处才是可信的 User
}
```

类型只在编译期存在。**模型输出、接口响应、URL 参数、本地存储全都是 `unknown`**，必须先用 Zod / Valibot 之类的库校验。这一点在 [AI Agent 工具调用](/ai-agent/05-tool-calling) 里是生产级系统的分水岭。

## 七、工程配置清单

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // arr[0] 变成 T | undefined，逼你处理边界
    "exactOptionalPropertyTypes": true, // 区分「没传」和「传了 undefined」
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,       // 强制 type-only import，避免运行时误引入
    "skipLibCheck": true                // 三方声明冲突时救急，但别当默认依赖
  }
}
```

| 建议 | 原因 |
|---|---|
| 优先 `unknown` 而非 `any` | `any` 会关闭后续所有检查并可传染 |
| 类型断言 `as` 只在有证据时用 | 断言是「我比编译器懂」，多数时候是藏 bug |
| 公共 API 显式写返回类型 | 防止推断意外变化、加速增量编译 |
| 用 `satisfies` 写配置表 | 同时拿到校验与字面量补全 |
| 给联合类型加穷尽检查 | 新增分支时编译器提醒你改所有 switch |
| 类型也要测试 | 用 `expectTypeOf` / `tsd` 断言关键推导，防止重构悄悄破坏 |

## 动手任务

1. 把一个 `any` 满天飞的工具函数改造成泛型 + `unknown` + 类型守卫，记录编译报错暴露出的真实问题。
2. 用 `satisfies` 重写一份路由/主题配置，验证 IDE 能补全字面量且缺字段会报错。
3. 用 `infer` 给项目里的请求封装补上返回类型推导，删掉手写的重复类型。
4. 打开 `noUncheckedIndexedAccess`，处理完所有新增报错，再评估这个开关值不值得长期开。

参考：[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)、[Zod](https://zod.dev/)、本站 [TypeScript 实用技巧](/notes/typescript-tips)
