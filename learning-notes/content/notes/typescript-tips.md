---
title: "TypeScript 实用技巧"
description: "TypeScript 进阶技巧学习笔记，包括工具类型、类型守卫、泛型基础和模板字面量类型"
category: "notes"
date: "2026-07-01"
---

# TypeScript 实用技巧

TypeScript 为 JavaScript 添加了静态类型系统，掌握一些实用技巧可以大幅提升代码质量和开发效率。这篇笔记整理了一些日常开发中最常用的 TS 技巧。

## 工具类型（Utility Types）

TypeScript 内置了一系列工具类型，用于对已有类型进行常见变换。

### Partial —— 将所有属性变为可选

```typescript
interface User {
  id: number
  name: string
  email: string
  avatar: string
}

// 所有属性变为可选，适合用于更新操作
type PartialUser = Partial<User>
// 等价于: { id?: number; name?: string; email?: string; avatar?: string }

// 实际用法：只更新部分字段
function updateUser(id: number, updates: Partial<User>) {
  // updates 中可以只提供部分属性
  return { ...getUser(id), ...updates }
}

updateUser(1, { name: '新名字' })
updateUser(1, { email: 'new@example.com', avatar: 'new.png' })
```

### Required —— 将所有属性变为必填

```typescript
interface Config {
  host?: string
  port?: number
  debug?: boolean
}

// 所有属性变为必填
type RequiredConfig = Required<Config>
// 等价于: { host: string; port: number; debug: boolean }

// 用于确保配置项完整
function initServer(config: RequiredConfig) {
  // 此时 config 的每个属性都一定有值
}
```

### Pick —— 从类型中选取部分属性

```typescript
interface Article {
  id: number
  title: string
  content: string
  author: string
  createdAt: Date
  updatedAt: Date
}

// 只选取列表页需要的字段
type ArticleListItem = Pick<Article, 'id' | 'title' | 'author' | 'createdAt'>
// 等价于: { id: number; title: string; author: string; createdAt: Date }

// API 返回类型
function getArticleList(): ArticleListItem[] {
  // 只需要返回必要字段，减少数据传输
  return []
}
```

### Omit —— 从类型中排除部分属性

```typescript
// 排除不需要的字段（与 Pick 相反）
type CreateArticle = Omit<Article, 'id' | 'createdAt' | 'updatedAt'>
// 等价于: { title: string; content: string; author: string }

// 创建文章时不需要提供 id 和时间戳（由服务端生成）
function createArticle(data: CreateArticle): Article {
  return {
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data
  }
}
```

### Record —— 构造键值对类型

```typescript
// 定义状态码到消息的映射
type StatusCode = 200 | 400 | 404 | 500

const statusMessages: Record<StatusCode, string> = {
  200: '成功',
  400: '请求参数错误',
  404: '资源未找到',
  500: '服务器内部错误'
}

// 定义用户角色权限
type Role = 'admin' | 'editor' | 'viewer'
type Permission = 'read' | 'write' | 'delete'

const rolePermissions: Record<Role, Permission[]> = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read']
}
```

## 类型守卫（Type Guards）

类型守卫用于在运行时缩小变量的类型范围，让 TypeScript 更精确地推断类型。

### typeof 守卫

```typescript
function formatValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    // 这里 TypeScript 知道 value 是 string
    return value.toUpperCase()
  }
  if (typeof value === 'number') {
    // 这里 TypeScript 知道 value 是 number
    return value.toFixed(2)
  }
  // 这里 TypeScript 知道 value 是 boolean
  return value ? '是' : '否'
}
```

### instanceof 守卫

```typescript
class ApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

function handleError(error: Error | ApiError): string {
  if (error instanceof ApiError) {
    // 这里可以安全访问 statusCode
    return `[${error.statusCode}] ${error.message}`
  }
  // 普通 Error
  return error.message
}
```

### in 操作符守卫

```typescript
interface Fish {
  swim(): void
  name: string
}

interface Bird {
  fly(): void
  name: string
}

function move(animal: Fish | Bird): void {
  if ('swim' in animal) {
    // TypeScript 推断 animal 是 Fish
    animal.swim()
  } else {
    // TypeScript 推断 animal 是 Bird
    animal.fly()
  }
}
```

### 自定义类型守卫（is 关键字）

```typescript
interface Admin {
  role: 'admin'
  permissions: string[]
}

interface User {
  role: 'user'
  email: string
}

// 自定义类型守卫函数
function isAdmin(person: Admin | User): person is Admin {
  return person.role === 'admin'
}

function showDashboard(person: Admin | User) {
  if (isAdmin(person)) {
    // TypeScript 知道这里 person 是 Admin
    console.log('权限列表:', person.permissions)
  } else {
    // TypeScript 知道这里 person 是 User
    console.log('邮箱:', person.email)
  }
}
```

### 可辨识联合类型（Discriminated Unions）

```typescript
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
  | { status: 'loading' }

function handleResult<T>(result: Result<T>) {
  switch (result.status) {
    case 'success':
      // TypeScript 知道这里有 data
      console.log('数据:', result.data)
      break
    case 'error':
      // TypeScript 知道这里有 error
      console.error('错误:', result.error.message)
      break
    case 'loading':
      console.log('加载中...')
      break
  }
}
```

## 泛型基础（Generics）

泛型让函数和类型可以适用于多种数据类型，而不是写死某一种。

### 泛型函数

```typescript
// 没有泛型：只能处理特定类型
function getFirstNumber(arr: number[]): number {
  return arr[0]
}

// 有泛型：可以处理任意类型
function getFirst<T>(arr: T[]): T {
  return arr[0]
}

const num = getFirst([1, 2, 3])       // 推断为 number
const str = getFirst(['a', 'b', 'c']) // 推断为 string
const bool = getFirst([true, false])   // 推断为 boolean
```

### 泛型约束

```typescript
// 约束泛型必须包含 length 属性
interface HasLength {
  length: number
}

function logLength<T extends HasLength>(value: T): void {
  console.log(`长度: ${value.length}`)
}

logLength('hello')        // OK: string 有 length
logLength([1, 2, 3])      // OK: array 有 length
// logLength(123)         // Error: number 没有 length

// 使用 keyof 约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { name: '张三', age: 25, email: 'test@test.com' }
getProperty(user, 'name')  // OK，返回 string
// getProperty(user, 'foo') // Error: 'foo' 不是 user 的属性
```

### 泛型接口

```typescript
// 通用的 API 响应类型
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 通用的分页类型
interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 使用示例
type UserResponse = ApiResponse<User>
type UserListResponse = PaginatedResult<User>

async function getUsers(): Promise<UserListResponse> {
  const response = await fetch('/api/users')
  return response.json()
}
```

### 泛型实战：类型安全的 EventEmitter

```typescript
type EventMap = {
  login: { userId: string; timestamp: number }
  logout: { userId: string }
  'data-update': { table: string; id: number }
}

class TypedEventEmitter<T extends Record<string, unknown>> {
  private listeners: Partial<Record<keyof T, Function[]>> = {}

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(callback)
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.listeners[event]?.forEach(cb => cb(data))
  }
}

const emitter = new TypedEventEmitter<EventMap>()

// 类型安全：事件名和数据结构都受到类型检查
emitter.on('login', (data) => {
  console.log(`用户 ${data.userId} 在 ${data.timestamp} 登录`)
})

emitter.emit('login', { userId: 'u001', timestamp: Date.now() })
// emitter.emit('login', { wrong: 'data' }) // Error: 类型不匹配
```

## 模板字面量类型（Template Literal Types）

模板字面量类型允许在类型层面拼接字符串，用于构造精确的类型约束。

### 基础用法

```typescript
type Color = 'red' | 'green' | 'blue'
type Size = 'sm' | 'md' | 'lg'

// 组合生成所有可能的类名
type ClassName = `${Size}-${Color}`
// 'sm-red' | 'sm-green' | 'sm-blue' | 'md-red' | 'md-green' | ...

// CSS 属性值
type Spacing = `${number}px` | `${number}rem` | `${number}%`
const margin: Spacing = '16px'    // OK
const padding: Spacing = '1.5rem' // OK
// const gap: Spacing = 'large'   // Error
```

### 实用示例：API 路由类型

```typescript
type Resource = 'users' | 'posts' | 'comments'
type Action = 'list' | 'get' | 'create' | 'update' | 'delete'

type ApiRoute = `/api/${Resource}/${Action}`
// '/api/users/list' | '/api/users/get' | '/api/posts/create' | ...

// 带参数的路由
type ApiRouteWithId = `/api/${Resource}/${number}/${Action}`
// '/api/users/1/get' | '/api/posts/42/update' | ...

function callApi(route: ApiRoute): Promise<unknown> {
  return fetch(route).then(res => res.json())
}
```

### 字符串操作类型

```typescript
// 转大写
type Shout<T extends string> = Uppercase<T>
type A = Shout<'hello'> // 'HELLO'

// 转小写
type Whisper<T extends string> = Lowercase<T>
type B = Whisper<'HELLO'> // 'hello'

// 首字母大写（驼峰）
type CamelCase<T extends string> = Capitalize<T>
type C = CamelCase<'hello'> // 'Hello'

// 首字母小写
type Uncapitalize<T extends string> = Uncapitalize<T>
type D = Uncapitalize<'Hello'> // 'hello'

// 实际应用：将 snake_case 属性名转为 camelCase
type SnakeToCamelKey<T extends string> =
  T extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamelKey<Tail>>}`
    : T

type Test = SnakeToCamelKey<'user_name'> // 'userName'
type Test2 = SnakeToCamelKey<'created_at_time'> // 'createdAtTime'
```

## 小结

本篇笔记涵盖的 TypeScript 技巧在日常开发中使用频率非常高：

1. **工具类型**：`Partial`、`Required`、`Pick`、`Omit`、`Record` 用于快速派生新类型
2. **类型守卫**：在运行时安全地缩小类型范围，`typeof`、`instanceof`、`in`、自定义 `is` 守卫
3. **泛型**：让代码同时具备复用性和类型安全，是 TypeScript 最核心的能力之一
4. **模板字面量类型**：在类型层面进行字符串操作，适合构造精确的 API 类型约束

建议在实际项目中多加练习，尤其是泛型和工具类型的组合使用，能显著提升 TypeScript 的使用水平。
