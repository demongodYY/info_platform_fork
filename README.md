# Rare Disease Info Platform

一个基于 Nuxt 3 的罕见病文章平台，集成了智能新闻爬虫系统，用于收集、翻译和展示罕见病相关的新闻文章。

🌐 **在线访问**：[fshdyouth.com](https://fshdyouth.com)（HTTPS 由服务器 `nginx-ssl` 终结）

## 🏗️ 架构图

```mermaid
graph TB
    subgraph "数据采集层"
        A[罕见病新闻网站] -->|爬取| B[rare_disease_bot<br/>Python 爬虫]
        B -->|Playwright| C[浏览器自动化]
        C -->|LangChain + Qwen3-max| D[智能分析 & 翻译]
        D -->|生成 Markdown| E[server/articles/<br/>YYYYMMDD/域名/]
        E -->|专业版| F[markdown_professional/]
        E -->|小白版| G[markdown_simplified/]
    end

    subgraph "构建与导入"
        H[GitHub Actions] -->|pnpm build + prebuild| I[import-articles.js]
        I -->|读取当天 Markdown| E
        I -->|REST API| K[Supabase<br/>PostgreSQL]
        H -->|产出 .output| J[Nuxt 构建产物]
    end

    subgraph "应用服务层"
        K -->|查询| L[Nuxt Server API]
        L -->|/api/notes| M[文章列表 API]
        L -->|/api/notes/:id| N[文章详情 API]
    end

    subgraph "前端展示层"
        M -->|SSR| P[Nuxt 3 应用]
        N -->|SSR| P
        P --> Q[文章列表 / 搜索 / 详情]
    end

    subgraph "部署层"
        T[push main] --> H
        H -->|SCP + Docker| U[腾讯云轻量服务器<br/>info_platform :3000]
        V[nginx-ssl 容器] -->|HTTPS :443| W[公网用户]
        V -->|proxy_pass| U
    end

    style K fill:#e1ffe1
    style P fill:#f0e1ff
    style U fill:#ffe1e1
    style V fill:#e1f5ff
```

## ✨ 功能特性

- 📰 **文章展示**：文章列表、详情与 Markdown 渲染
- ✍️ **内容管理**：创建与编辑文章
- 🔍 **智能搜索**：罕见病相关信息检索
- 🤖 **智能爬虫**：自动爬取并翻译新闻（专业版 / 小白版）
- 🔄 **构建时导入**：`prebuild` 将当天爬取文章写入 Supabase
- 🎨 **响应式 UI**：支持移动端

## 🛠️ 技术栈

### 前端

- [Nuxt 3](https://nuxt.com) · [Vue 3](https://vuejs.org) · [TypeScript](https://www.typescriptlang.org) · [Sass](https://sass-lang.com)

### 后端与数据

- [Supabase](https://supabase.com)（PostgreSQL）
- Nuxt Server API

### 爬虫子项目 `rare_disease_bot`

- LangChain · Playwright · Qwen（通义千问）· Python 3

### 部署

- [GitHub Actions](.github/workflows/ci-cd.yml)（lint / test / build / 部署）
- 腾讯云轻量服务器 + Docker
- 宿主机 `nginx-ssl`（80/443，证书与反代配置在服务器上维护）

## 📁 项目结构

```
.
├── pages/                 # 页面路由
├── components/            # Vue 组件（含 SiteFooter 备案信息）
├── layouts/               # 布局（全站页脚）
├── server/
│   ├── api/               # API
│   ├── articles/          # 爬虫生成的 Markdown
│   └── scripts/
│       └── import-articles.js   # prebuild 导入脚本
├── rare_disease_bot/      # Python 爬虫
├── .github/workflows/     # CI/CD
├── Dockerfile             # 运行时镜像（仅 Node + .output）
├── docs/deploy-cloud.md   # 服务器与 GitHub 配置说明
└── scripts/docker-deploy-remote.sh
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm
- Python 3.8+（爬虫）
- Supabase 项目

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境变量（本地）

复制并填写 `.env`（勿提交 Git）。字段与云端一致，详见下方 [云端环境变量](#云端环境变量)：

```bash
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_KEY=...   # prebuild 导入文章
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# 若使用搜索等功能，按代码需要补充 POSTGRES_*、EMBEDDING_* 等
```

### 3. 本地开发

```bash
pnpm dev
```

访问 http://localhost:3000

### 4. 本地构建

```bash
pnpm build
pnpm preview
```

`pnpm build` 会先执行 `prebuild`（`import-articles.js`），导入 `server/articles/` 下**当天**目录中的专业版 Markdown。

## 📝 使用 rare_disease_bot 爬虫

爬虫需在**本地手动运行**。流程概览：

1. 在 `rare_disease_bot/` 配置 `.env` 并安装依赖（见 [rare_disease_bot/README.md](./rare_disease_bot/README.md)）
2. 运行 `python main.py --url ... --max-articles N`
3. 将 `server/articles/` 下新文章提交到仓库
4. **合并到 `main`** 后，GitHub Actions 在构建阶段执行 `prebuild` 导入数据库并部署

```bash
git add server/articles/
git commit -m "chore: 添加爬取的文章"
git push origin main   # 或在 PR 合并进 main 后自动部署
```

> 仅**当天**（按 `YYYYMMDD` 目录名）的文章会被 `import-articles.js` 导入。

## 🚢 生产部署

生产环境由 **GitHub Actions** 构建并部署到腾讯云，**不使用 Vercel**。

| 步骤 | 说明                                                                  |
| ---- | --------------------------------------------------------------------- |
| 触发 | `push` 到 `main`（非 PR）                                             |
| CI   | `pnpm lint` · `pnpm test`                                             |
| 构建 | `pnpm build`（含 prebuild）                                           |
| 发布 | SCP `.output` + `Dockerfile` 到服务器 → `docker build` / `docker run` |
| 入口 | `nginx-ssl` 提供 HTTPS，反代到应用 `:3000`                            |

服务器防火墙、Nginx、证书路径见 **[docs/deploy-cloud.md](./docs/deploy-cloud.md)**。Workflow 说明见 [.github/workflows/README.md](.github/workflows/README.md)。

### 云端环境变量

在 **GitHub 仓库**（`OpenRareDisease/info_platform`）配置：**Settings → Secrets and variables → Actions**。  
部署时 CI 会把 Secrets 写入服务器 `/home/info_platform/.env`，供 Docker 容器运行时读取。  
本地 `.env` 应与下列变量**保持一致**（便于对照与调试），但**不要**把 `.env` 提交到 Git。

#### GitHub Variables（非敏感）

| 变量名                | 必填 | 说明                                        | 示例               |
| --------------------- | ---- | ------------------------------------------- | ------------------ |
| `DEPLOY_HOST`         | 是   | 轻量服务器公网 IP                           | `119.29.130.172`   |
| `DEPLOY_PORT`         | 否   | SSH 端口，默认 `22`                         | `22`               |
| `APP_PORT`            | 否   | 应用映射到宿主机端口，默认 `3000`           | `3000`             |
| `DOCKER_NETWORK`      | 否   | 与 `nginx-ssl` 同 Docker 网络时使用         | 按服务器实际网络名 |
| `APP_CONTAINER_IP`    | 否   | 与 Nginx `proxy_pass` 目标 IP 一致时填写    | `10.1.0.10`        |
| `NGINX_SSL_CONTAINER` | 否   | 部署后重启的 Nginx 容器名，默认 `nginx-ssl` | `nginx-ssl`        |

#### GitHub Secrets（敏感）

**SSH 部署**

| Secret        | 用途                         |
| ------------- | ---------------------------- |
| `DEPLOY_KEY`  | SSH 私钥全文（OpenSSH 格式） |
| `DEPLOY_USER` | SSH 登录用户，如 `root`      |

**构建阶段**（`pnpm build` 与 `prebuild` / `import-articles.js`）

| Secret                          | 用途                                             |
| ------------------------------- | ------------------------------------------------ |
| `SUPABASE_URL`                  | Supabase 项目 URL                                |
| `SUPABASE_KEY`                  | Anon key（prebuild 可代替 SERVICE_KEY）          |
| `SUPABASE_SERVICE_KEY`          | Service role key（导入文章、服务端写库）         |
| `SUPABASE_SERVICE_ROLE_KEY`     | 与上类似，按你 Supabase 面板中的命名配置其一即可 |
| `NEXT_PUBLIC_SUPABASE_URL`      | 打进前端构建产物                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 打进前端构建产物                                 |

**运行时**（写入服务器 `.env`，容器 `--env-file` 加载）

除上述外，部署流程还会写入：

| Secret                     | 用途                       |
| -------------------------- | -------------------------- |
| `SUPABASE_JWT_SECRET`      | Supabase JWT（若模块需要） |
| `POSTGRES_URL`             | Postgres 连接串            |
| `POSTGRES_URL_NON_POOLING` | 非连接池 URL（如有）       |
| `POSTGRES_PRISMA_URL`      | Prisma 用 URL（如有）      |
| `POSTGRES_HOST`            | 数据库主机                 |
| `POSTGRES_USER`            | 数据库用户                 |
| `POSTGRES_PASSWORD`        | 数据库密码                 |
| `POSTGRES_DATABASE`        | 数据库名                   |

容器内还会固定写入：`NODE_ENV=production`、`HOST=0.0.0.0`、`PORT=3000`（无需在 GitHub 单独配置）。

#### 配置检查清单

1. **构建能过**：至少配置 `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`（或 `SUPABASE_KEY`）+ `NEXT_PUBLIC_SUPABASE_*`。
2. **部署能连服务器**：`DEPLOY_HOST`（Variables）+ `DEPLOY_KEY` + `DEPLOY_USER`。
3. **线上能访问数据**：运行时 Secrets 与本地 `.env` 一致，且 Supabase / Postgres 允许服务器出口访问。
4. **HTTPS**：证书在服务器 `/home/ssl/...`，由 `nginx-ssl` 挂载，**不需要**放进本仓库。

若新增功能依赖其他环境变量（如搜索用的 Embedding API），需在 `ci-cd.yml` 的 build / `.env` 写入步骤中一并加入对应 Secret。

## 🔄 开发流程

本仓库为**唯一生产仓库**（[OpenRareDisease/info_platform](https://github.com/OpenRareDisease/info_platform)），无 fork、无上游同步、无 Vercel。

```bash
git checkout -b feat/your-feature
pnpm lint && pnpm test
git push origin feat/your-feature
# GitHub 创建 PR → 合并 main → 自动部署
```

## 📚 开发指南

```bash
pnpm lint          # 检查
pnpm lint:fix      # 自动修复
pnpm format        # Prettier
pnpm test          # Vitest
```

提交前 Husky 会运行 lint-staged 与测试。测试说明见 [TEST_SETUP.md](./TEST_SETUP.md)。

## 🔧 数据与 API

- **导入**：构建时 `server/scripts/import-articles.js` → Supabase `notes` 表
- **API**：`GET/POST /api/notes`、`GET/PATCH /api/notes/:id` 等
- **展示**：Nuxt SSR 从 Supabase 读取

## 📖 相关文档

- [部署说明](./docs/deploy-cloud.md)
- [贡献指南](./CONTRIBUTING.md)
- [测试配置](./TEST_SETUP.md)
- [rare_disease_bot](./rare_disease_bot/README.md)
- [Nuxt 3 文档](https://nuxt.com/docs)
- [Supabase 文档](https://supabase.com/docs)

## 📄 License

[MIT License](LICENSE)
