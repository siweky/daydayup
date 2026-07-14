---
title: "Python 进阶特性"
description: "生成器、异步编程、上下文管理器、元类等 Python 高级特性"
category: "python"
date: "2026-07-14"
---

## 生成器 (Generator)

生成器是一种惰性求值的迭代器，适合处理大数据集或无限序列：

```python
def fibonacci():
    """无限斐波那契数列生成器"""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# 使用
fib = fibonacci()
[next(fib) for _ in range(10)]
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### 生成器表达式

与列表推导式语法类似，但使用圆括号，惰性求值更省内存：

```python
# 列表推导式 — 立即创建完整列表
squares_list = [x ** 2 for x in range(1000000)]  # 占用大量内存

# 生成器表达式 — 按需生成
squares_gen = (x ** 2 for x in range(1000000))   # 几乎不占内存

# 常用于 sum / max / min 等聚合函数
total = sum(x ** 2 for x in range(1000))
```

## 异步编程 (asyncio)

Python 的异步编程模型基于 `async/await` 语法：

```python
import asyncio
import aiohttp

async def fetch_url(url: str) -> str:
    """异步获取 URL 内容"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def main():
    urls = [
        "https://api.github.com",
        "https://httpbin.org/get",
        "https://jsonplaceholder.typicode.com/posts/1",
    ]
    # 并发执行多个请求
    tasks = [fetch_url(url) for url in urls]
    results = await asyncio.gather(*tasks)
    for url, result in zip(urls, results):
        print(f"{url}: {len(result)} bytes")

asyncio.run(main())
```

### 异步迭代器与上下文管理器

```python
async def async_range(start, stop):
    """异步生成器"""
    for i in range(start, stop):
        await asyncio.sleep(0.1)  # 模拟异步操作
        yield i

async def main():
    async for num in async_range(1, 5):
        print(num)
```

## 装饰器进阶

### 类装饰器

```python
class Singleton:
    """单例模式装饰器"""
    def __init__(self, cls):
        self.cls = cls
        self.instance = None

    def __call__(self, *args, **kwargs):
        if self.instance is None:
            self.instance = self.cls(*args, **kwargs)
        return self.instance

@Singleton
class DatabaseConnection:
    def __init__(self):
        self.connected = True
        print("数据库连接已建立")

a = DatabaseConnection()  # 输出: 数据库连接已建立
b = DatabaseConnection()  # 无输出（复用同一实例）
a is b  # True
```

### functools 常用装饰器

```python
from functools import lru_cache, partial, wraps

# lru_cache — 自动缓存函数结果
@lru_cache(maxsize=128)
def expensive_computation(n: int) -> int:
    if n < 2:
        return n
    return expensive_computation(n - 1) + expensive_computation(n - 2)

expensive_computation(100)  # 瞬间返回，无需重复计算

# partial — 固定部分参数
multiply = partial(int.__mul__, 2)  # 不太好使，换个例子
from operator import mul
double = partial(mul, 2)
double(5)  # 10
```

## 异常处理最佳实践

```python
import logging

logger = logging.getLogger(__name__)

class AppError(Exception):
    """应用自定义异常基类"""
    def __init__(self, message: str, code: int = 500):
        super().__init__(message)
        self.code = code

class ValidationError(AppError):
    def __init__(self, field: str, message: str):
        super().__init__(f"验证失败 [{field}]: {message}", code=400)
        self.field = field

def process_user(data: dict) -> dict:
    if "name" not in data:
        raise ValidationError("name", "姓名不能为空")
    if not isinstance(data.get("age"), int):
        raise ValidationError("age", "年龄必须是整数")
    return {"id": 1, **data}

try:
    result = process_user({"name": "Alice", "age": "二十五"})
except ValidationError as e:
    logger.warning(f"验证错误: {e} (字段: {e.field}, 状态码: {e.code})")
except AppError as e:
    logger.error(f"应用错误: {e} (状态码: {e.code})")
except Exception as e:
    logger.exception(f"未预期的错误: {e}")
    raise  # 重新抛出未预期的异常
```

## 类型提示进阶

```python
from typing import TypeVar, Generic, Protocol, TypeAlias

# 类型别名
UserId: TypeAlias = int
UserDict: TypeAlias = dict[str, str | int]

# 泛型
T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self):
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

    def peek(self) -> T | None:
        return self._items[-1] if self._items else None

# 协议（结构化子类型，类似 duck typing）
class Renderable(Protocol):
    def render(self) -> str: ...

def display(obj: Renderable) -> None:
    print(obj.render())
```

## 常用内置函数精选

| 函数 | 用途 | 示例 |
|------|------|------|
| `enumerate()` | 带索引遍历 | `for i, v in enumerate(lst)` |
| `zip()` | 并行遍历 | `for a, b in zip(x, y)` |
| `map()` | 映射转换 | `list(map(str, [1,2,3]))` |
| `filter()` | 过滤 | `list(filter(bool, [0,1,"",None]))` |
| `sorted()` | 排序 | `sorted(items, key=lambda x: x.age)` |
| `any()` / `all()` | 布尔聚合 | `any(x > 0 for x in nums)` |
| `isinstance()` | 类型检查 | `isinstance(obj, (int, float))` |
| `getattr()` | 安全属性访问 | `getattr(obj, "name", "default")` |
| `hasattr()` | 属性检查 | `hasattr(obj, "method")` |
| `vars()` | 查看对象属性 | `vars(obj)` 返回 `__dict__` |
