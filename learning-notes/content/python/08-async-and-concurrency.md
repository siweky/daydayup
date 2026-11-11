---
title: "Python 异步与并发进阶"
description: "事件循环与 await 语义、Task/gather/Semaphore、阻塞陷阱、线程与进程池、取消超时，以及并发调用模型 API 的实战"
category: "python"
date: "2026-11-11"
---

> [Python 进阶特性](/python/05-advanced) 已经讲了 `asyncio` 的基本语法，这一篇聚焦**生产里真正会出问题的部分**：阻塞、并发上限、取消、超时与调试。

## 一、asyncio 到底并发了什么

```python
import asyncio

async def main():
    await asyncio.sleep(1)   # 把控制权交还事件循环，等待期间可以跑别的协程

asyncio.run(main())
```

关键认知：

- `await` 只在遇到**可让出的 I/O 等待**时才切换协程；`async def` 本身不会让函数变快。
- 事件循环是**单线程**的，协程之间协作式调度；一个协程里跑 CPU 密集计算或同步阻塞调用，整个循环都会卡住。
- 协程对象创建后不会执行，必须 `await`、交给 `create_task` 或 `gather`。

```python
# ❌ 串行：每个请求依次等待
for url in urls:
    await fetch(url)

# ✅ 并发：同时发起，总耗时约等于最慢的那个
await asyncio.gather(*(fetch(u) for u in urls))
```

## 二、阻塞事件循环的三种典型写法

```python
import time, requests

async def bad():
    time.sleep(2)              # ❌ 同步睡眠，阻塞整个循环
    requests.get(url)          # ❌ 同步 HTTP，阻塞 IO 等待
    sum(i * i for i in range(10**7))  # ❌ CPU 密集，阻塞
```

对应改法：

| 问题 | 改法 |
|---|---|
| `time.sleep` | `await asyncio.sleep` |
| `requests` | `httpx.AsyncClient` / `aiohttp` |
| 同步文件读写 | `asyncio.to_thread(...)` 或 `aiofiles` |
| CPU 密集计算 | `ProcessPoolExecutor` / 原生扩展 / 向量化库 |
| 同步 SDK | 检查是否有 async 版本，没有就 `to_thread` 包一层 |

```python
import asyncio, httpx

async def fetch(client: httpx.AsyncClient, url: str) -> str:
    r = await client.get(url, timeout=8.0)
    r.raise_for_status()
    return r.text

async def main(urls: list[str]):
    async with httpx.AsyncClient() as client:   # 复用连接池
        return await asyncio.gather(*(fetch(client, u) for u in urls))
```

## 三、并发控制：别一口气打爆上游

`gather` 不限制并发数。调用模型 API、数据库或第三方服务时，必须限流：

```python
import asyncio

sem = asyncio.Semaphore(5)

async def limited_call(item):
    async with sem:
        return await call_model(item)

results = await asyncio.gather(*(limited_call(i) for i in items))
```

| 工具 | 用途 |
|---|---|
| `asyncio.Semaphore(n)` | 限制同时进行的协程数 |
| `asyncio.TaskGroup`（3.11+） | 结构化并发，任一失败自动取消同组任务 |
| `asyncio.wait_for` / `timeout` | 单次调用超时 |
| `asyncio.Queue` | 生产者-消费者，控制内存与背压 |
| `gather(..., return_exceptions=True)` | 单个失败不影响整批，之后再逐一处理 |

取消语义要特别小心：

```python
try:
    await asyncio.wait_for(call_model(prompt), timeout=10)
except asyncio.TimeoutError:
    # 任务已被取消，上游请求也应随之关闭（用支持取消的客户端）
    log_timeout()
except asyncio.CancelledError:
    # 不要吞掉：清理资源后重新抛出
    cleanup()
    raise
```

**不要捕获 `CancelledError` 后当普通异常处理并继续执行**，那会让「用户已取消」的任务继续烧钱。

## 四、并发调用 LLM API：一个完整例子

```python
import asyncio
import httpx
from dataclasses import dataclass

@dataclass
class Result:
    prompt: str
    text: str | None
    error: str | None

async def one(client: httpx.AsyncClient, sem: asyncio.Semaphore, prompt: str) -> Result:
    async with sem:
        try:
            r = await client.post(
                "https://api.example.com/v1/chat/completions",
                json={"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}]},
                timeout=15.0,
            )
            r.raise_for_status()
            return Result(prompt, r.json()["choices"][0]["message"]["content"], None)
        except (httpx.HTTPError, asyncio.TimeoutError) as e:
            return Result(prompt, None, str(e))   # 单个失败不拖垮整批

async def batch(prompts: list[str], concurrency: int = 4) -> list[Result]:
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(one(client, sem, p) for p in prompts))

# asyncio.run(batch(prompts))
```

要点：复用 `AsyncClient`（连接池）、`Semaphore` 对齐速率限制、逐个捕获异常、设置超时。这套模式与 [Agent 工具并发执行](/ai-agent/05-tool-calling) 的 TypeScript 实现是同一思路。

## 五、Task、TaskGroup 与结构化并发

```python
# 3.11+ 推荐：异常会自动传播并取消同组任务
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(fetch_a())
    t2 = tg.create_task(fetch_b())
# 走到这里，两个任务都已完成或整组被取消
```

对比 `create_task` + 手动 `await`：后者容易留下「后台任务没人 await」，异常被吞掉、进程退出时被强制取消。经验法则：**创建的每个 Task 都要有明确的归属与等待点**。

## 六、线程池与进程池

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def cpu_bound(data):           # 普通同步函数
    return heavy_compute(data)

async def main(items):
    loop = asyncio.get_running_loop()
    # I/O 阻塞 → 线程池
    await loop.run_in_executor(None, blocking_io_call)
    # CPU 密集 → 进程池（绕开 GIL）
    with ProcessPoolExecutor() as pool:
        return await asyncio.gather(*(loop.run_in_executor(pool, cpu_bound, i) for i in items))
```

| 任务类型 | 选择 |
|---|---|
| 网络/磁盘等待 | `asyncio` + async 库 |
| 只有同步 SDK 可用 | `asyncio.to_thread` |
| 纯 Python CPU 计算 | `ProcessPoolExecutor` |
| NumPy / 向量化运算 | 库内部已释放 GIL，通常直接调用即可 |

## 七、调试与常见错误

```bash
PYTHONASYNCIODEBUG=1 python main.py     # 慢回调警告、未 await 的协程
```

| 报错 / 现象 | 原因 |
|---|---|
| `RuntimeWarning: coroutine was never awaited` | 创建了协程对象却没执行 |
| `RuntimeError: no running event loop` | 在同步函数里直接 `await` / 用了 `asyncio.get_event_loop()` |
| `RuntimeError: event loop is closed` | 在 Jupyter / 多次 `asyncio.run` 场景复用客户端 |
| 程序「卡住」不报错 | 忘设超时、`Semaphore` 未释放、死锁或同步阻塞 |
| 并发反而更慢 | 上游限流、连接池过小、GIL 争用或开了过多进程 |

排查顺序：加超时 → 打印任务状态（`asyncio.all_tasks()`）→ 打开 debug 模式 → 检查是否有同步阻塞调用。

## 动手任务

1. 用 `gather` 与串行版本分别请求 20 个 URL，记录耗时差异。
2. 加上 `Semaphore(3)` 与超时，模拟其中一个请求永久挂起，验证其余任务不受影响。
3. 故意在协程里用 `time.sleep` 和 `requests.get`，用 debug 模式观察事件循环被阻塞的证据，再改掉。
4. 把 [05 篇](/python/05-advanced) 的 asyncio 示例改写成 `TaskGroup` + 限流 + 结构化错误处理，并写 pytest 用例覆盖超时分支。

延伸：[Python asyncio 文档](https://docs.python.org/3/library/asyncio.html)、[HTTPX 异步客户端](https://www.python-httpx.org/async/)、[Python 与 AI Agent](/python/09-python-for-ai-agents)
