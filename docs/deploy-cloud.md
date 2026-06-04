# 腾讯云轻量服务器（Docker）部署

Workflow：[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**push 到 `main`** 时：

1. **quality** — `pnpm lint` + `pnpm test`
2. **build** — 在 GitHub Actions 上 `pnpm build`（含 `prebuild` → `import-articles.js`），产出 `.output` 并上传 artifact
3. **deploy** — 服务器 `git pull`（Dockerfile / 脚本）→ SCP 上传 `.output` → 轻量 `docker build` + `docker run`

服务器上不再跑 `pnpm install` / Nitro 全量构建，避免轻量机超时。

## GitHub Variables

| Name          | 说明                           |
| ------------- | ------------------------------ |
| `DEPLOY_HOST` | 服务器 IP，如 `119.29.130.172` |
| `DEPLOY_PORT` | SSH 端口，默认 `22`            |
| `APP_PORT`    | 应用端口，默认 `3000`          |

## GitHub Secrets

| Name                                                     | 说明                         |
| -------------------------------------------------------- | ---------------------------- |
| `DEPLOY_KEY`                                             | SSH 私钥全文                 |
| `DEPLOY_USER`                                            | SSH 用户，如 `root`          |
| `SUPABASE_URL` / `SUPABASE_KEY` / `SUPABASE_SERVICE_KEY` | **构建**（prebuild）+ 运行时 |
| `NEXT_PUBLIC_SUPABASE_*`                                 | **构建**（打进前端）+ 运行时 |
| `POSTGRES_*` 等                                          | 运行时 `.env`                |

`prebuild` 使用 `SUPABASE_SERVICE_KEY` 或 `SUPABASE_KEY`（与 `import-articles.js` 一致）。

## 服务器

- 目录：`/home/info_platform`
- `.output` 由 CI 上传，不来自 git
- 对外 HTTPS：宿主机 Nginx 反代 `127.0.0.1:3000`
