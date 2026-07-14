---
title: "Python 简介与环境搭建"
description: "Python 语言概述、特点介绍及开发环境安装指南"
category: "python"
date: "2026-07-14"
---

## Python 简介

Python 是一种高级、解释型、通用编程语言，由 Guido van Rossum 于 1991 年首次发布。Python 的设计哲学强调代码可读性，其语法允许程序员用更少的代码行表达概念。

### 核心特点

- **简洁易读**：Python 使用缩进来定义代码块，使代码结构清晰直观
- **动态类型**：变量不需要提前声明类型，解释器会自动推断
- **丰富的标准库**：内置大量模块，涵盖文件 I/O、网络、数据库等
- **跨平台**：支持 Windows、macOS、Linux 等主流操作系统
- **强大的生态**：拥有 PyPI 上数十万个第三方包

### Python 的应用领域

| 领域 | 典型框架/工具 |
|------|--------------|
| Web 开发 | Django, Flask, FastAPI |
| 数据科学 | NumPy, Pandas, Matplotlib |
| 机器学习 | TensorFlow, PyTorch, scikit-learn |
| 自动化脚本 | Selenium, BeautifulSoup |
| 网络爬虫 | Scrapy, Requests |

## 环境安装

### 安装 Python

访问 [python.org](https://www.python.org/downloads/) 下载最新版本。推荐使用 Python 3.10 或更高版本。

```bash
# macOS (Homebrew)
brew install python

# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Windows
# 从官网下载安装包，勾选 "Add Python to PATH"
```

### 验证安装

```bash
python --version
pip --version
```

### 虚拟环境

虚拟环境是 Python 项目管理依赖的最佳实践，可以避免不同项目之间的依赖冲突：

```bash
# 创建虚拟环境
python -m venv .venv

# 激活（macOS/Linux）
source .venv/bin/activate

# 激活（Windows）
.venv\Scripts\activate

# 退出虚拟环境
deactivate
```

### 包管理工具 pip

```bash
# 安装包
pip install requests

# 安装指定版本
pip install requests==2.28.0

# 导出依赖
pip freeze > requirements.txt

# 从文件安装依赖
pip install -r requirements.txt
```

## 第一个 Python 程序

创建文件 `hello.py`：

```python
# hello.py
def greet(name: str) -> str:
    """生成问候语"""
    return f"你好，{name}！欢迎学习 Python 🐍"

if __name__ == "__main__":
    message = greet("World")
    print(message)
```

运行：

```bash
python hello.py
```

## 推荐的开发工具

- **VS Code** + Python 扩展：轻量级、插件丰富
- **PyCharm**：JetBrains 出品，功能强大的 Python IDE
- **Jupyter Notebook**：适合数据科学和交互式编程学习
