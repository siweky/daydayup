---
title: "Python Web 开发入门"
description: "FastAPI、Flask 框架对比，RESTful API 开发实战"
category: "python"
date: "2026-07-14"
---

## Web 框架对比

| 特性 | Flask | FastAPI | Django |
|------|-------|---------|--------|
| 定位 | 微框架 | 现代 API 框架 | 全功能框架 |
| 异步支持 | 有限 | 原生 | 3.1+ 支持 |
| 类型提示 | 不需要 | 核心特性 | 不需要 |
| 自动文档 | 无 | Swagger + ReDoc | Admin 后台 |
| 学习曲线 | 低 | 低 | 中高 |
| 适用场景 | 小项目/原型 | API 服务 | 大型 Web 应用 |

## FastAPI 快速上手

### 安装

```bash
pip install fastapi uvicorn[standard]
```

### Hello World

```python
# main.py
from fastapi import FastAPI

app = FastAPI(title="学习笔记 API", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Hello, FastAPI!"}

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "query": q}
```

启动开发服务器：

```bash
uvicorn main:app --reload --port 8000
```

访问 `http://localhost:8000/docs` 即可查看自动生成的 Swagger 文档。

### 请求体与数据验证

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    content: str
    tags: list[str] = []

class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    tags: list[str]

# 模拟数据库
notes_db: dict[int, dict] = {}
next_id = 1

@app.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(note: NoteCreate):
    global next_id
    note_data = {
        "id": next_id,
        **note.model_dump(),
    }
    notes_db[next_id] = note_data
    next_id += 1
    return note_data

@app.get("/notes", response_model=list[NoteResponse])
async def list_notes():
    return list(notes_db.values())

@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: int):
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return notes_db[note_id]

@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: int):
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="笔记不存在")
    del notes_db[note_id]
```

### 依赖注入

```python
from fastapi import Depends

# 依赖函数
async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    token: str = Header(...),
    db = Depends(get_db),
):
    user = await db.get(User, decode_token(token))
    if not user:
        raise HTTPException(status_code=401, detail="无效的认证信息")
    return user

@app.get("/me")
async def read_me(user = Depends(get_current_user)):
    return user
```

## Flask 快速入门

### 安装与基本用法

```bash
pip install flask
```

```python
# app.py
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route("/")
def index():
    return jsonify({"message": "Hello, Flask!"})

@app.route("/api/notes", methods=["GET", "POST"])
def notes():
    if request.method == "POST":
        data = request.get_json()
        # 处理创建逻辑
        return jsonify({"id": 1, **data}), 201
    return jsonify([])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

### Blueprint 模块化

```python
# routes/notes.py
from flask import Blueprint, jsonify

notes_bp = Blueprint("notes", __name__, url_prefix="/api/notes")

@notes_bp.route("/")
def list_notes():
    return jsonify([])

# app.py
from routes.notes import notes_bp
app.register_blueprint(notes_bp)
```

## 连接数据库（SQLAlchemy）

无论 FastAPI 还是 Flask，SQLAlchemy 都是 Python Web 开发中最常用的 ORM：

```python
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# 数据库连接（SQLite 示例）
engine = create_engine("sqlite:///./notes.db")
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    content = Column(Text)

# 创建表
Base.metadata.create_all(bind=engine)

# CRUD 操作
db = SessionLocal()
note = Note(title="学习 FastAPI", content="非常好用的框架")
db.add(note)
db.commit()

# 查询
notes = db.query(Note).all()
```
