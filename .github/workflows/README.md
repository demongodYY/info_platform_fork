# GitHub Actions Workflows

## ci-cd.yml

`push` / `pull_request` 到 `main`：

| Job       | 何时运行     | 说明                                                   |
| --------- | ------------ | ------------------------------------------------------ |
| `quality` | 始终         | lint + test                                            |
| `deploy`  | `main` 非 PR | 同 job 内 `pnpm build` → SCP `.output` → 服务器 Docker |

配置见 [docs/deploy-cloud.md](../../docs/deploy-cloud.md)。
