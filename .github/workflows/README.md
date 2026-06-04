# CI/CD

单一 workflow：[ci-cd.yml](./ci-cd.yml)

- **quality**：lint + test（PR / push / fork 同步）
- **deploy**：仅 `OpenRareDisease/info_platform` 的 `main` push（SSH + Docker）

Fork 的 [sync-to-upstream.yml](./sync-to-upstream.yml) 调用本文件并设 `skip_deploy: true`，只跑检查。

配置见 [docs/deploy-cloud.md](../../docs/deploy-cloud.md)。
