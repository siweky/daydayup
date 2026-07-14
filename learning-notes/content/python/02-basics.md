---
title: "Python 基础语法"
description: "变量、数据类型、运算符、控制流等 Python 基础语法详解"
category: "python"
date: "2026-07-14"
---

## 变量与赋值

Python 是动态类型语言，变量不需要声明类型，赋值即创建：

```python
# 基本赋值
name = "Python"
version = 3.12
is_awesome = True

# 多重赋值
a, b, c = 1, 2, 3
x = y = z = 0

# 类型提示（Python 3.5+，不强制但推荐）
age: int = 25
score: float = 98.5
label: str = "hello"
```

## 基本数据类型

### 数值类型

```python
# 整数 (int) — 无大小限制
big_num = 10 ** 100

# 浮点数 (float)
pi = 3.14159

# 复数 (complex)
z = 3 + 4j

# 布尔值 (bool)
is_valid = True
is_empty = False
```

### 字符串 (str)

Python 字符串是不可变的 Unicode 序列，支持丰富的操作方法：

```python
# 定义字符串
single = 'hello'
double = "world"
multi = """多行
字符串"""
raw = r"C:\Users\path"  # 原始字符串，不转义

# f-string 格式化（推荐）
name = "Python"
version = 3.12
info = f"{name} {version}"  # "Python 3.12"

# 常用方法
text = "  Hello, World!  "
text.strip()       # "Hello, World!"
text.lower()       # "  hello, world!  "
text.split(",")    # ['  Hello', ' World!  ']
text.replace("Hello", "Hi")
text.startswith("  Hello")  # True

# 字符串切片
s = "Python"
s[0]      # 'P'
s[-1]     # 'n'
s[0:3]    # 'Pyt'
s[::2]    # 'Pto'（步长为 2）
s[::-1]   # 'nohtyP'（反转）
```

## 集合类型

### 列表 (list)

可变有序序列，可存放任意类型元素：

```python
fruits = ["apple", "banana", "cherry"]

# 增删改查
fruits.append("date")        # 末尾添加
fruits.insert(1, "avocado")  # 指定位置插入
fruits.pop()                 # 移除末尾
fruits.remove("banana")      # 按值移除
fruits[0] = "apricot"        # 修改元素

# 切片操作
nums = [0, 1, 2, 3, 4, 5]
nums[1:4]    # [1, 2, 3]
nums[:3]     # [0, 1, 2]
nums[3:]     # [3, 4, 5]

# 列表推导式 — Python 的精华之一
squares = [x ** 2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]
```

### 元组 (tuple)

不可变有序序列，常用于函数返回多个值：

```python
point = (3, 4)
x, y = point  # 解包

# 命名元组
from collections import namedtuple
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
```

### 字典 (dict)

键值对映射，Python 3.7+ 保持插入顺序：

```python
user = {
    "name": "Alice",
    "age": 30,
    "skills": ["Python", "SQL"],
}

# 访问与修改
user["name"]            # "Alice"
user.get("email", "N/A")  # "N/A"（安全访问）
user["email"] = "a@b.com"
del user["age"]

# 字典推导式
square_map = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
```

### 集合 (set)

无序不重复元素集：

```python
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

a | b   # 并集 {1, 2, 3, 4, 5, 6}
a & b   # 交集 {3, 4}
a - b   # 差集 {1, 2}
a ^ b   # 对称差集 {1, 2, 5, 6}
```

## 控制流

### 条件语句

```python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "D"

# 三元表达式
status = "pass" if score >= 60 else "fail"

# match-case（Python 3.10+，类似 switch）
command = "start"
match command:
    case "start":
        print("Starting...")
    case "stop":
        print("Stopping...")
    case _:
        print("Unknown command")
```

### 循环

```python
# for 循环
for item in ["a", "b", "c"]:
    print(item)

# 带索引遍历
for i, item in enumerate(["a", "b", "c"]):
    print(f"{i}: {item}")

# while 循环
count = 0
while count < 5:
    print(count)
    count += 1

# range 对象
for i in range(0, 10, 2):  # 0, 2, 4, 6, 8
    print(i)
```

## 运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| `+` `-` `*` `/` | 算术运算 | `10 / 3 → 3.333` |
| `//` | 整除 | `10 // 3 → 3` |
| `%` | 取余 | `10 % 3 → 1` |
| `**` | 幂运算 | `2 ** 10 → 1024` |
| `==` `!=` `<` `>` | 比较运算 | `3 > 2 → True` |
| `and` `or` `not` | 逻辑运算 | `True and False → False` |
| `in` `not in` | 成员运算 | `"a" in "abc" → True` |
| `is` `is not` | 身份运算 | `a is b`（比较是否为同一对象） |
