# 腾讯云轻量服务器（Docker）部署

仓库：[OpenRareDisease/info_platform](https://github.com/OpenRareDisease/info_platform)

Workflow：[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) — 同一 run 内先 `quality`（lint/test），通过后 `deploy`（SSH + Docker）。

## 服务器要求

- 镜像：**Ubuntu + Docker**（如 Ubuntu22.04-Docker26）
- 首次在服务器执行：

```bash
git clone https://github.com/OpenRareDisease/info_platform.git /home/info_platform
```

- 对外 **HTTPS 443**：容器内 Nuxt 监听 **3000**。请在宿主机用 **Nginx/Caddy** 将 443 反代到 `127.0.0.1:3000`（腾讯官方示例 `-p 443:443` 不适用于未在容器内配置 TLS 的 Node 应用）。

## GitHub Variables（Actions → Variables）

| Variable      | 示例 / 说明                          |
| ------------- | ------------------------------------ |
| `DEPLOY_HOST` | 如 `119.29.130.172`                  |
| `DEPLOY_USER` | 如 `root`（Variable 或 Secret 均可） |
| `APP_PORT`    | 可选，默认 `3000`                    |
| `DEPLOY_PORT` | 可选，SSH 端口，默认 `22`            |

## GitHub Secrets（Actions → Secrets）

| Secret                          | 示例 / 说明                                         |
| ------------------------------- | --------------------------------------------------- |
| `DEPLOY_KEY`                    | SSH 私钥全文（**必须**是 Secret，不能放 Variables） |
| `DEPLOY_USER`                   | 也可放 Secret；若已在 Variables 配置则不必重复      |
| `SUPABASE_URL`                  | 运行时 + 构建                                       |
| `SUPABASE_KEY`                  | 运行时                                              |
| `SUPABASE_SERVICE_KEY`          | 运行时 + 构建（prebuild）                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | 运行时 + 构建                                       |
| `SUPABASE_JWT_SECRET`           | 运行时                                              |
| `NEXT_PUBLIC_SUPABASE_URL`      | 运行时                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 运行时                                              |
| `POSTGRES_*`                    | 运行时（共 7 项）                                   |

Fork 同步 PR 另需 **`PAT`**（仅 fork 仓库）。

可选 **Variables**：`APP_PORT`（默认 `3000`，健康检查与宿主机映射端口）。

## 每次 push `main` 后 Actions 做什么

1. SSH：`git fetch` + `reset` 到 `origin/main`
2. SSH：按 Secrets 写入 `/home/info_platform/.env`
3. SSH：`docker build`（注入 Supabase build-arg）→ `docker run --env-file .env`
4. SSH：`curl` 检查 `http://127.0.0.1:3000/`

## 宿主机 Nginx 443 示例（片段）

```nginx
server {
    listen 443 ssl;
    server_name www.raredisease.top;
    # ssl_certificate ...
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 安全提醒

若私钥曾出现在聊天/日志中，请在服务器更换密钥对并更新 GitHub `DEPLOY_KEY`。
