---
title: "Python 面向对象编程"
description: "类与对象、继承、多态、魔术方法、dataclass 等 OOP 核心概念"
category: "python"
date: "2026-07-14"
---

## 类的基本定义

```python
class Dog:
    """一只狗的类"""

    # 类变量（所有实例共享）
    species = "Canis familiaris"

    def __init__(self, name: str, age: int):
        # 实例变量
        self.name = name
        self.age = age

    def bark(self) -> str:
        return f"{self.name} says: Woof!"

    def __str__(self) -> str:
        return f"Dog({self.name}, {self.age}岁)"

    def __repr__(self) -> str:
        return f"Dog(name='{self.name}', age={self.age})"


buddy = Dog("Buddy", 3)
print(buddy.bark())  # "Buddy says: Woof!"
print(buddy)         # "Dog(Buddy, 3岁)"
```

## 继承与多态

```python
class Animal:
    def __init__(self, name: str):
        self.name = name

    def speak(self) -> str:
        raise NotImplementedError("子类必须实现 speak 方法")

class Cat(Animal):
    def speak(self) -> str:
        return f"{self.name}: Meow!"

class Dog(Animal):
    def speak(self) -> str:
        return f"{self.name}: Woof!"

# 多态
animals = [Cat("咪咪"), Dog("旺财"), Cat("小花")]
for animal in animals:
    print(animal.speak())
# 咪咪: Meow!
# 旺财: Woof!
# 小花: Meow!
```

### 多重继承与 MRO

Python 支持多重继承，方法解析顺序（MRO）使用 C3 线性化算法：

```python
class A:
    def greet(self):
        return "Hello from A"

class B(A):
    def greet(self):
        return "Hello from B"

class C(A):
    def greet(self):
        return "Hello from C"

class D(B, C):
    pass

d = D()
d.greet()     # "Hello from B" — B 在 MRO 中先于 C
D.__mro__     # (D, B, C, A, object)
```

## 属性与描述符

### @property 装饰器

```python
class Temperature:
    def __init__(self, celsius: float = 0):
        self._celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float):
        if value < -273.15:
            raise ValueError("温度不能低于绝对零度")
        self._celsius = value

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9 / 5 + 32

    @property
    def kelvin(self) -> float:
        return self._celsius + 273.15

temp = Temperature(100)
temp.fahrenheit  # 212.0
temp.kelvin      # 373.15
```

## 魔术方法 (Magic Methods)

Python 的魔术方法让自定义类能像内置类型一样工作：

```python
class Vector:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def __add__(self, other: "Vector") -> "Vector":
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, scalar: float) -> "Vector":
        return Vector(self.x * scalar, self.y * scalar)

    def __abs__(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __eq__(self, other) -> bool:
        return self.x == other.x and self.y == other.y

    def __repr__(self) -> str:
        return f"Vector({self.x}, {self.y})"

    def __len__(self) -> int:
        """返回向量维度"""
        return 2

v1 = Vector(3, 4)
v2 = Vector(1, 2)

v1 + v2      # Vector(4, 6)
v1 * 3       # Vector(9, 12)
abs(v1)      # 5.0
```

### 常用魔术方法速查

| 方法 | 用途 | 触发方式 |
|------|------|----------|
| `__init__` | 初始化实例 | `MyClass()` |
| `__str__` | 可读字符串 | `str(obj)` / `print(obj)` |
| `__repr__` | 精确字符串 | `repr(obj)` / 控制台 |
| `__len__` | 长度 | `len(obj)` |
| `__getitem__` | 索引访问 | `obj[key]` |
| `__iter__` | 迭代 | `for x in obj` |
| `__contains__` | 成员检查 | `x in obj` |
| `__enter__/__exit__` | 上下文管理 | `with obj` |
| `__call__` | 可调用 | `obj()` |

## 上下文管理器

`with` 语句确保资源被正确释放：

```python
class FileManager:
    def __init__(self, filename: str, mode: str = "r"):
        self.filename = filename
        self.mode = mode

    def __enter__(self):
        self.file = open(self.filename, self.mode)
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.file.close()
        return False  # 不抑制异常

# 使用
with FileManager("data.txt", "w") as f:
    f.write("Hello, Python!")
# 文件在此处自动关闭
```

也可以使用 `contextlib` 简化实现：

```python
from contextlib import contextmanager

@contextmanager
def temp_directory():
    import tempfile, shutil
    path = tempfile.mkdtemp()
    try:
        yield path
    finally:
        shutil.rmtree(path)

with temp_directory() as tmpdir:
    print(f"临时目录: {tmpdir}")
# 自动清理
```

## dataclass（Python 3.7+）

`dataclass` 自动生成 `__init__`、`__repr__`、`__eq__` 等方法：

```python
from dataclasses import dataclass, field

@dataclass
class Product:
    name: str
    price: float
    quantity: int = 0
    tags: list[str] = field(default_factory=list)

    @property
    def total_value(self) -> float:
        return self.price * self.quantity

p = Product("键盘", 299.0, 10, ["电子", "外设"])
print(p)  # Product(name='键盘', price=299.0, quantity=10, tags=['电子', '外设'])
print(p.total_value)  # 2990.0
```

### 不可变 dataclass

```python
@dataclass(frozen=True)
class Point:
    x: float
    y: float

p = Point(1.0, 2.0)
# p.x = 3.0  # FrozenInstanceError — 不可修改
```

## 抽象基类 (ABC)

定义接口规范，强制子类实现特定方法：

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        pass

    @abstractmethod
    def perimeter(self) -> float:
        pass

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        return 3.14159 * self.radius ** 2

    def perimeter(self) -> float:
        return 2 * 3.14159 * self.radius

# shape = Shape()  # TypeError — 不能实例化抽象类
c = Circle(5)
c.area()  # 78.53975
```
