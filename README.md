# 纠结消消乐 · Next.js 全栈版

把今天的小纠结装进盲盒，拆出一个能落地的小答案。一个轻量的决策小玩具。

- **前端**：Next.js 15（React 19）+ App Router
- **后端**：Next.js API Routes（`/api/*`）—— LLM 答案代理 + 真·社区广场
- **数据库**：Postgres（Neon / Vercel Postgres）—— 社区帖子 / 投票 / 限流
- **AI**：默认 Google Gemini（免费 1500 次/天），可切 Anthropic Claude
- **部署**：GitHub + Vercel，push 即自动部署

## 本地运行

```bash
npm install
npm run dev          # http://localhost:3000
```

不配任何环境变量也能跑：AI 自动回退到本地模板引擎，社区显示种子帖子。

## 环境变量（部署时配在 Vercel）

| 变量 | 说明 | 必需 |
|---|---|---|
| `LLM_PROVIDER` | `gemini`（默认）/ `deepseek`（国内可直连）/ `anthropic` / `openai` | 否 |
| `GEMINI_API_KEY` | Google AI Studio 的免费 key | 用 gemini 时 |
| `DEEPSEEK_API_KEY` | DeepSeek 的 key（platform.deepseek.com，国内可注册） | 用 deepseek 时 |
| `ANTHROPIC_API_KEY` | Anthropic key | 用 anthropic 时 |
| `OPENAI_API_KEY` | OpenAI key | 用 openai 时 |
| `DATABASE_URL` | Postgres 连接串（Neon / Vercel Postgres） | 开真社区才需要 |
| `DAILY_LIMIT` | 每 IP 每天调用上限（默认 40） | 否 |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL（OG 图用），如 `https://xxx.vercel.app` | 否 |

> DeepSeek / OpenAI 没有内建联网搜索，「找附近的店」会退化成普通答案；Gemini / Anthropic 支持真实搜索。

数据库表（posts / votes / rate_limit）在首次访问时自动建好，无需手动迁移。

## API

| 路由 | 方法 | 作用 |
|---|---|---|
| `/api/health` | GET | 健康检查 + 配置状态 |
| `/api/answer` | POST | 盲盒答案（LLM） |
| `/api/answer-search` | POST | 带真实搜索的答案 |
| `/api/poll-options` | POST | 社区二选一选项生成 |
| `/api/community` | GET/POST | 广场帖子列表 / 发帖 |
| `/api/community/vote` | POST | 投票 |

## 结构

```
app/            页面 + API routes
components/      React 组件（刮刮乐 / 社区 / 设置 / 分享）
lib/            data 内容库 / 答案引擎 / 人格 / LLM 代理 / DB / 状态
public/         manifest + 图标
```
