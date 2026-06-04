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

## 故障排查：`Failed to fetch dynamically imported module` / 500

浏览器报 `/_nuxt/xxxx.js` 加载失败，通常是 **JS 没返回 200**（404、502 或返回了 HTML 错误页），常见原因：

1. **部署产物不完整**：`.output/public/_nuxt` 未上传全 → 已在 workflow 中解压前 `rm -rf .output` 并校验 chunk 数量。
2. **HTML 与 JS 版本不一致**：强刷 `Ctrl+Shift+R` 或无痕窗口；确保刚完成一次完整 deploy。
3. **Nginx 未把 `/_nuxt/` 反代到应用**：`location /` 应 `proxy_pass` 到 Node `:3000`（不要单独拦截静态目录到错误路径）。
4. **页面 SSR 500**：接口/Supabase 环境变量缺失 → `docker logs info_platform --tail 100`。

**服务器上自查：**

```bash
# 宿主机直连应用（绕过 nginx-ssl）
curl -sI "http://127.0.0.1:3000/"
curl -sI "http://127.0.0.1:3000/_nuxt/"  # 目录可能 404，正常

# 在容器内看静态资源是否存在
docker exec info_platform ls .output/public/_nuxt | head

# 把 Bz8gy3d_.js 换成控制台里报错的文件名
curl -sI "http://127.0.0.1:3000/_nuxt/Bz8gy3d_.js"
# 期望：HTTP/1.1 200 且 Content-Type 含 javascript
```

若 `127.0.0.1:3000` 正常而域名不行，问题在 **nginx-ssl** 配置；若 3000 也 404，问题在 **部署的 .output** 或镜像构建。

## Nginx / 证书（服务器上，不进仓库）

- 配置：`/home/nginx/conf/nginx.conf`
- 证书：`/home/ssl/diseasae.fshdyouth.com_nginx/`
- 变更后：`docker restart nginx-ssl`
