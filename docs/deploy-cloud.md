# 腾讯云轻量服务器（Docker）部署

Workflow：[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**push 到本仓库 `main`** → lint/test → SSH 部署（`git pull` + Docker）。

## GitHub Variables

| Name          | 说明                           |
| ------------- | ------------------------------ |
| `DEPLOY_HOST` | 服务器 IP，如 `119.29.130.172` |
| `DEPLOY_PORT` | SSH 端口，默认 `22`            |
| `APP_PORT`    | 应用端口，默认 `3000`          |

## GitHub Secrets

| Name                                          | 说明                                |
| --------------------------------------------- | ----------------------------------- |
| `DEPLOY_KEY`                                  | SSH 私钥全文                        |
| `DEPLOY_USER`                                 | SSH 用户，如 `root`                 |
| `SUPABASE_*` / `NEXT_PUBLIC_*` / `POSTGRES_*` | 运行时 `.env`（与本地 `.env` 一致） |

## 服务器

- 目录：`/home/info_platform`
- 首次自动 `git clone` 当前仓库
- 对外 HTTPS：宿主机 Nginx 反代 `127.0.0.1:3000`

```bash
# 可选：手动首次 clone
git clone https://github.com/<你的用户名>/info_platform.git /home/info_platform
```
