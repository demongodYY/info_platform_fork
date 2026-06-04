# GitHub Actions

## ci-cd.yml

| Job       | 何时        | 说明                                                  |
| --------- | ----------- | ----------------------------------------------------- |
| `quality` | PR / push   | lint + test                                           |
| `deploy`  | `main` push | GitHub `pnpm build` → SCP → 服务器 Docker（仅 :3000） |

HTTPS 由宿主机 `nginx-ssl` 处理，见 [docs/deploy-cloud.md](../../docs/deploy-cloud.md)。
