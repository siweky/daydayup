---
title: 'TypeScript 类型体操入门'
description: '学习 TypeScript 高级类型系统，掌握常用类型技巧'
date: '2024-11-20'
---

# TypeScript 类型体操入门

## 基础类型工具

### Partial - 可选属性

将类型的所有属性变为可选：

```ts
interface User {
  name: string
  age: number
  email: string
}

type PartialUser = Partial<User>
// { name?: string; age?: number; email?: string }
```

### Required - 必选属性

与 Partial 相反，将所有属性变为必选：

```ts
type RequiredUser = Required<PartialUser>
```

### Pick - 选取属性

从类型中选取指定的属性：

```ts
type UserName = Pick<User, 'name'>
// { name: string }
```

## 条件类型

条件类型根据条件选择不同的类型：

```ts
type IsString<T> = T extends string ? true : false

type A = IsString<string> // true
type B = IsString<number> // false
```

## 模板字面量类型

TypeScript 4.1 引入的模板字面量类型非常强大：

```ts
type EventName = `on${Capitalize<string>}`

const handler: EventName = 'onClick' // 合法
```

## 实用技巧

1. **使用 `as const` 获取字面量类型**
2. **善用 `infer` 关键字推导类型**
3. **利用映射类型批量转换**

类型体操虽然看起来复杂，但掌握后能大幅提升代码的类型安全性。
