# GitHub Actions Workflows

## ci-cd.yml

`push` / `pull_request` 到 `main`：

| Job       | 何时运行        | 说明                                        |
| --------- | --------------- | ------------------------------------------- |
| `quality` | 始终            | lint + test                                 |
| `build`   | 仅 `main` 非 PR | `pnpm build`（含 prebuild），上传 `.output` |
| `deploy`  | `build` 成功后  | SCP `.output` + 服务器 Docker 运行          |

配置见 [docs/deploy-cloud.md](../../docs/deploy-cloud.md)。
