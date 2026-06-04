# 腾讯云轻量服务器（Docker）部署

Workflow：[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**push 到 `main`** 时：

1. **quality** — `pnpm lint` + `pnpm test`
2. **deploy** — GitHub 上 `pnpm build` → 打包并 SCP 到服务器（`.output` + `Dockerfile` + 脚本）→ 轻量 `docker build` + `docker run`

服务器**不需要**访问 GitHub（国内轻量机 `git clone` 常 TLS 失败）；所有文件由 CI 经 SSH 上传。

服务器上不再跑 `pnpm install` / Nitro 全量构建。

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

- 目录：`/home/info_platform`（由 CI 上传维护，无需在服务器 `git pull`）
- 对外 HTTPS：宿主机 Nginx 反代 `127.0.0.1:3000`
