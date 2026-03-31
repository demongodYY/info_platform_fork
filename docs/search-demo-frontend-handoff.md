# 搜索 Demo 前端对接文档

## 1. 功能说明

当前实现的是一个“单次搜索”的搜索 Demo，不再是多轮 chatbot。

用户输入一个搜索词后，前端会调用流式搜索接口，按步骤接收后端返回的检索过程，并在页面上实时展示：

- 站内内容检索
- 权威来源搜索
- 互联网补充搜索
- 大模型聚合整理后的最终回答

页面调试入口：

- `/search-demo`

## 2. 接口信息

### 2.1 请求地址

`POST /api/search/stream`

### 2.2 请求体

```json
{
  "query": "庞贝病 基因治疗 最新进展"
}
```

字段说明：

- `query`: 用户输入的搜索词，必填

### 2.3 响应类型

接口返回的是流式响应，不是普通 JSON。

响应头：

```http
Content-Type: application/x-ndjson; charset=utf-8
```

返回内容是按行分隔的 JSON，每一行都是一个事件对象。

## 3. 事件格式

### 3.1 检索过程事件

当某一步完成后，后端会立即返回一条 `trace` 事件。

示例：

```json
{
  "type": "trace",
  "trace": [
    {
      "key": "local-notes",
      "label": "站内内容检索",
      "status": "empty",
      "detail": "notes 0 条，cache 0 条"
    }
  ]
}
```

字段说明：

- `type`: 固定为 `trace`
- `trace`: 当前已经完成的检索步骤数组

`trace` 中每个步骤对象字段如下：

- `key`: 步骤唯一标识
- `label`: 步骤名称，直接给前端展示
- `status`: 当前步骤状态
- `detail`: 当前步骤结果描述

### 3.2 最终结果事件

当检索和聚合全部完成后，后端会返回一条 `result` 事件。

示例：

```json
{
  "type": "result",
  "result": {
    "query": "庞贝病 基因治疗 最新进展",
    "answer": "这里是最终聚合回答",
    "messageStatus": "completed",
    "sources": [
      {
        "title": "NORD update",
        "sourceType": "reference",
        "sourceTier": "authority",
        "sourceLabel": "NORD",
        "sourceUrl": "https://example.com",
        "sourceDomain": "example.com",
        "snippet": "来源摘要",
        "publishedAt": "2026-03-20T00:00:00.000Z",
        "rank": 1
      }
    ],
    "searchTrace": [
      {
        "key": "local-notes",
        "label": "站内内容检索",
        "status": "empty",
        "detail": "notes 0 条，cache 0 条"
      },
      {
        "key": "authority-search",
        "label": "权威来源搜索",
        "status": "success",
        "detail": "命中 1 条结果"
      }
    ]
  }
}
```

### 3.3 错误事件

如果搜索过程中出现异常，后端会返回一条 `error` 事件。

示例：

```json
{
  "type": "error",
  "message": "搜索失败"
}
```

## 4. 字段约定

### 4.1 `status` 字段

检索过程中的 `status` 取值：

- `success`: 当前步骤成功并命中结果
- `empty`: 当前步骤成功执行，但没有命中结果
- `error`: 当前步骤执行失败

### 4.2 `messageStatus` 字段

最终结果中的 `messageStatus` 取值：

- `completed`: 正常完成
- `failed`: 没有拿到足够证据，返回降级回答
- `safety_routed`: 命中安全分流，返回安全提示

### 4.3 `sourceTier` 字段

来源卡片中的 `sourceTier` 取值：

- `authority`: 权威来源
- `internet_supplement`: 互联网补充来源

## 5. 前端推荐接入方式

### 5.1 基本流程

前端建议这样处理：

1. 用户点击搜索
2. `fetch('/api/search/stream')`
3. 读取流响应
4. 每收到一条 `trace` 事件，就立即更新“检索过程”区域
5. 收到 `result` 事件后，更新最终回答和来源卡片
6. 收到 `error` 事件后，显示错误提示并结束加载

### 5.2 示例代码

```ts
type SearchTraceEntry = {
  key: string
  label: string
  status: 'success' | 'empty' | 'error'
  detail: string
}

type SearchResponse = {
  query: string
  answer: string
  messageStatus: 'completed' | 'failed' | 'safety_routed'
  sources: Array<{
    title: string
    sourceType: string
    sourceTier: 'authority' | 'internet_supplement'
    sourceLabel: string
    sourceUrl: string
    sourceDomain: string
    snippet: string
    publishedAt: string | null
    rank: number
  }>
  searchTrace: SearchTraceEntry[]
}

type StreamEvent =
  | { type: 'trace'; trace: SearchTraceEntry[] }
  | { type: 'result'; result: SearchResponse }
  | { type: 'error'; message: string }

export async function searchWithStream(
  query: string,
  onTrace: (trace: SearchTraceEntry[]) => void
) {
  const response = await fetch('/api/search/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('未拿到可读流')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: SearchResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      const event = JSON.parse(line) as StreamEvent

      if (event.type === 'trace') {
        onTrace(event.trace)
      } else if (event.type === 'result') {
        finalResult = event.result
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }
  }

  if (!finalResult) {
    throw new Error('未收到最终结果')
  }

  return finalResult
}
```

## 6. 页面展示建议

### 6.1 检索过程区

建议直接展示后端返回的 `trace` 数组，不要自己硬编码最终文案。

推荐方式：

- `label` 用作步骤标题
- `detail` 用作步骤结果说明
- `status` 决定颜色和图标

示例：

- `站内内容检索` / `notes 0 条，cache 0 条`
- `权威来源搜索` / `命中 1 条结果`
- `互联网补充搜索` / `命中 8 条结果`

### 6.2 来源卡片区

按 `rank` 升序展示。

建议展示：

- 来源类型标签：`权威来源` 或 `互联网补充`
- `sourceLabel`
- `title`
- `snippet`
- 原文链接 `sourceUrl`

### 6.3 最终回答区

直接展示 `answer`，按段落换行渲染即可。

## 7. 注意事项

- 这是流式接口，不能按普通 `await response.json()` 处理
- 检索过程是“逐步覆盖更新”的，不是单条 step 增量 patch
- 当前页面是 Demo 页，重点是先把搜索能力和过程展示跑通
- 目前不包含用户登录、会话历史、上下文记忆

## 8. 当前文件位置

如需对照现有实现，可参考：

- 页面入口：`pages/search-demo.vue`
- 页面主组件：`components/search/SearchDemoShell.vue`
- 结果展示：`components/search/SearchResultPanel.vue`
- 流式接口：`server/api/search/stream.post.ts`
- 搜索流程：`server/api/search/_shared/search-flow.ts`
