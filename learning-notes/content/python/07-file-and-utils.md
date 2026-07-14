---
title: "Python 文件操作与常用工具"
description: "文件读写、路径处理、JSON/CSV 解析、日志记录等实用技巧"
category: "python"
date: "2026-07-14"
---

## 文件读写

### 基本操作

```python
# 写入文件
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("第一行笔记\n")
    f.write("第二行笔记\n")

# 追加内容
with open("notes.txt", "a", encoding="utf-8") as f:
    f.write("追加的一行\n")

# 读取全部内容
with open("notes.txt", "r", encoding="utf-8") as f:
    content = f.read()

# 按行读取（内存友好）
with open("notes.txt", "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())

# 读取为列表
with open("notes.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()  # ['第一行笔记\n', '第二行笔记\n', ...]
```

### pathlib — 现代路径处理

`pathlib` 是 Python 3.4+ 引入的面向对象路径操作库，比 `os.path` 更优雅：

```python
from pathlib import Path

# 创建路径对象
p = Path("data") / "notes" / "2026"  # data/notes/2026

# 常用操作
p.mkdir(parents=True, exist_ok=True)    # 递归创建目录
p.exists()                              # 是否存在
p.is_dir()                              # 是否为目录

# 遍历文件
for md_file in Path("content").glob("**/*.md"):
    print(md_file.name, md_file.stem, md_file.suffix)

# 读写文件的快捷方式
config_path = Path("config.json")
config_path.write_text('{"theme": "dark"}', encoding="utf-8")
data = config_path.read_text(encoding="utf-8")

# 路径信息
file = Path("/home/user/notes/hello.md")
file.parent    # /home/user/notes
file.name      # hello.md
file.stem      # hello
file.suffix    # .md
```

## JSON 处理

```python
import json

# 序列化
data = {
    "title": "Python 学习笔记",
    "tags": ["python", "编程"],
    "completed": True,
    "score": 95.5,
}

# 写入 JSON 文件
with open("note.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 读取 JSON 文件
with open("note.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)

# 字符串转换
json_str = json.dumps(data, ensure_ascii=False)
parsed = json.loads(json_str)
```

## CSV 处理

```python
import csv

# 写入 CSV
headers = ["姓名", "科目", "分数"]
rows = [
    ["张三", "Python", 95],
    ["李四", "JavaScript", 88],
    ["王五", "Go", 92],
]

with open("scores.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(rows)

# 读取为字典列表（推荐）
with open("scores.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(f"{row['姓名']} - {row['科目']}: {row['分数']}")
```

## 日志记录 (logging)

```python
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"),
        logging.StreamHandler(),  # 同时输出到控制台
    ],
)

logger = logging.getLogger(__name__)

logger.debug("调试信息（不会输出，因为级别设为 INFO）")
logger.info("应用启动成功")
logger.warning("配置文件使用默认值")
logger.error("数据库连接失败")

try:
    1 / 0
except ZeroDivisionError:
    logger.exception("捕获到异常")  # 自动附带堆栈信息
```

## 日期与时间

```python
from datetime import datetime, timedelta

now = datetime.now()
print(now.strftime("%Y-%m-%d %H:%M:%S"))  # 格式化输出

# 时间运算
tomorrow = now + timedelta(days=1)
last_week = now - timedelta(weeks=1)

# 解析时间字符串
dt = datetime.strptime("2026-07-14 10:30:00", "%Y-%m-%d %H:%M:%S")

# 时间戳转换
import time
timestamp = time.time()
dt_from_ts = datetime.fromtimestamp(timestamp)
```

## 正则表达式

```python
import re

text = "联系我：alice@example.com 或 bob@test.org"

# 查找所有邮箱
emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.]+', text)
# ['alice@example.com', 'bob@test.org']

# 替换
cleaned = re.sub(r'\d+', 'NUM', "abc123def456")  # "abcNUMdefNUM"

# 编译正则（重复使用时性能更好）
email_pattern = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')
matches = email_pattern.findall(text)

# 分组匹配
m = re.match(r'(\d{4})-(\d{2})-(\d{2})', "2026-07-14")
if m:
    year, month, day = m.groups()  # ('2026', '07', '14')
```

## 实用小技巧

### 列表去重并保持顺序

```python
seen = set()
result = [x for x in [3, 1, 4, 1, 5, 9, 2, 6, 5] if x not in seen and not seen.add(x)]
# [3, 1, 4, 5, 9, 2, 6]
```

### 字典合并

```python
a = {"x": 1, "y": 2}
b = {"y": 3, "z": 4}

merged = {**a, **b}           # Python 3.5+
merged = a | b                # Python 3.9+（更简洁）
# {'x': 1, 'y': 3, 'z': 4}
```

### 安全地获取嵌套字典值

```python
data = {"user": {"profile": {"name": "Alice", "age": 25}}}

# 链式 get
name = data.get("user", {}).get("profile", {}).get("name", "未知")
```

### 计时装饰器

```python
import time
from functools import wraps

def timeit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"⏱ {func.__name__} 耗时 {elapsed:.4f}s")
        return result
    return wrapper

@timeit
def slow_task():
    sum(range(10_000_000))

slow_task()
# ⏱ slow_task 耗时 0.2341s
```
