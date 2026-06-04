# CI/CD

单一 workflow：[ci-cd.yml](./ci-cd.yml)

- **push `main`**：先 lint/test，通过后自动部署到轻量服务器（Docker）
- **pull_request**：仅 lint/test，不部署

配置见 [docs/deploy-cloud.md](../../docs/deploy-cloud.md)。
