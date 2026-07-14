---
title: "Python 函数与模块"
description: "函数定义、参数传递、装饰器、模块导入等核心概念"
category: "python"
date: "2026-07-14"
---

## 函数定义

```python
def greet(name: str, greeting: str = "你好") -> str:
    """生成问候语（这是文档字符串 docstring）"""
    return f"{greeting}，{name}！"

# 调用
greet("Alice")                    # "你好，Alice！"
greet("Bob", greeting="Hi")      # "Hi，Bob！"
```

## 参数传递

### 位置参数与关键字参数

```python
def build_profile(first, last, **info):
    profile = {"first": first, "last": last}
    profile.update(info)
    return profile

user = build_profile("张", "三", age=25, city="北京")
# {'first': '张', 'last': '三', 'age': 25, 'city': '北京'}
```

### *args 与 **kwargs

```python
def flexible(*args, **kwargs):
    """接受任意数量的位置参数和关键字参数"""
    print(f"位置参数: {args}")     # 元组
    print(f"关键字参数: {kwargs}")  # 字典

flexible(1, 2, 3, name="test", value=42)
# 位置参数: (1, 2, 3)
# 关键字参数: {'name': 'test', 'value': 42}
```

### 参数解包

```python
def add(a, b, c):
    return a + b + c

nums = [1, 2, 3]
add(*nums)  # 6 — 列表解包为位置参数

params = {"a": 1, "b": 2, "c": 3}
add(**params)  # 6 — 字典解包为关键字参数
```

## Lambda 表达式

匿名函数，适用于简短的一次性操作：

```python
# 基本用法
square = lambda x: x ** 2
square(5)  # 25

# 常用于排序等场景
students = [("Alice", 85), ("Bob", 92), ("Charlie", 78)]
students.sort(key=lambda s: s[1], reverse=True)
# [('Bob', 92), ('Alice', 85), ('Charlie', 78)]

# 配合 map / filter
nums = [1, 2, 3, 4, 5]
list(map(lambda x: x * 2, nums))      # [2, 4, 6, 8, 10]
list(filter(lambda x: x > 3, nums))   # [4, 5]
```

## 装饰器 (Decorator)

装饰器是 Python 的强大特性，可以在不修改函数代码的情况下扩展其功能：

```python
import time
from functools import wraps

def timer(func):
    """测量函数执行时间"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} 执行耗时: {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "done"

slow_function()
# slow_function 执行耗时: 1.0012s
```

### 带参数的装饰器

```python
def retry(max_attempts=3, delay=1):
    """重试装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    print(f"第 {attempt} 次失败，{delay}s 后重试...")
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=5, delay=0.5)
def fetch_data(url):
    ...
```

## 模块与包

### 导入方式

```python
# 导入整个模块
import os
os.path.exists("/tmp")

# 导入特定对象
from os.path import exists, join
exists("/tmp")

# 别名导入
import numpy as np
from datetime import datetime as dt

# 导入包下所有公开对象（不推荐）
from module import *
```

### 创建自己的模块

```
my_project/
├── main.py
├── utils/
│   ├── __init__.py     # 标记为包（可为空）
│   ├── math_helpers.py
│   └── string_helpers.py
```

```python
# utils/math_helpers.py
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b
```

```python
# main.py
from utils.math_helpers import add, multiply

print(add(2, 3))       # 5
print(multiply(4, 5))  # 20
```

### 常用标准库模块

| 模块 | 用途 |
|------|------|
| `os` / `pathlib` | 文件与路径操作 |
| `sys` | 系统参数与解释器交互 |
| `json` | JSON 编解码 |
| `re` | 正则表达式 |
| `datetime` | 日期时间处理 |
| `collections` | 高级数据结构（Counter, defaultdict 等） |
| `itertools` | 迭代器工具 |
| `functools` | 函数工具（lru_cache, partial 等） |
| `typing` | 类型提示支持 |
| `dataclasses` | 数据类简化定义 |

## 类型提示 (Type Hints)

Python 3.5+ 引入类型提示，提高代码可读性和 IDE 支持：

```python
from typing import Optional

def process(items: list[str], count: int = 10) -> Optional[dict]:
    """处理字符串列表，返回结果字典或 None"""
    if not items:
        return None
    return {
        "processed": items[:count],
        "total": len(items),
    }

# 复杂类型
from typing import Union

def parse_value(raw: str) -> Union[int, float, str]:
    try:
        return int(raw)
    except ValueError:
        try:
            return float(raw)
        except ValueError:
            return raw
```
