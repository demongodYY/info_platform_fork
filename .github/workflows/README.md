# GitHub Actions

## ci-cd.yml

| Job       | 说明                                                                 |
| --------- | -------------------------------------------------------------------- |
| `quality` | lint + test                                                          |
| `deploy`  | 仅 upstream `main`：SSH 到轻量服务器 → `git pull` → Docker build/run |

部署目录：`/home/info_platform`（与腾讯 Lighthouse 引导一致）。

## sync-to-upstream.yml

Fork 调用 `ci-cd.yml` 且 `skip_deploy: true`，只做 CI，再向上游开 PR。

详见 [docs/deploy-cloud.md](../../docs/deploy-cloud.md)。
