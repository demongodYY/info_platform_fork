# 腾讯云轻量服务器（Docker）部署

Workflow：[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

## 架构

```text
公网 HTTPS :443
  → 宿主机 Docker：nginx-ssl（/home/nginx/conf/nginx.conf，证书 /home/ssl/...）
  → http://10.1.0.10:3000（或 127.0.0.1:3000，按你的 nginx 配置）
  → Docker：info_platform（仅 Node，监听 3000）
```

**GitHub Actions 只部署应用**，不修改 Nginx / SSL（基础设施单独维护）。

## GitHub Variables

| Name                  | 默认        | 说明                                              |
| --------------------- | ----------- | ------------------------------------------------- |
| `DEPLOY_HOST`         | —           | 服务器 IP                                         |
| `DEPLOY_PORT`         | `22`        | SSH                                               |
| `APP_PORT`            | `3000`      | 应用映射到宿主机端口                              |
| `DOCKER_NETWORK`      | 空          | 与 nginx-ssl 同网时填写（如需要固定 `10.1.0.10`） |
| `APP_CONTAINER_IP`    | 空          | 与 nginx `proxy_pass` 一致时填 `10.1.0.10`        |
| `NGINX_SSL_CONTAINER` | `nginx-ssl` | 部署后 `docker restart` 的 Nginx 容器名           |

**Secrets**（`DEPLOY_KEY`、`DEPLOY_USER`、`SUPABASE_*`、`POSTGRES_*`、`NEXT_PUBLIC_*` 等）见 **[README.md § 云端环境变量](../README.md#云端环境变量)**。

## 流程

`quality` → `deploy`：GitHub `pnpm build` → SCP 部署包 → 服务器 `docker build` + `docker run -p 3000:3000` → 可选重启 `nginx-ssl`。

## Nginx / 证书（服务器上，不进仓库）

- 配置：`/home/nginx/conf/nginx.conf`
- 证书：`/home/ssl/diseasae.fshdyouth.com_nginx/`
- 变更后：`docker restart nginx-ssl`
