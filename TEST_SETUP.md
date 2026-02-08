# 测试配置说明

## ✅ 已配置的测试工具

### 1. **Vitest** - 测试框架

- 配置文件: `vitest.config.ts`
- 测试环境: `happy-dom` (轻量级 DOM 环境)
- 覆盖率工具: `v8`

### 2. **@vue/test-utils** - Vue 组件测试工具

用于测试 Vue 组件

### 3. **Git Hooks** - Pre-commit 测试检查

使用 Husky 在提交前自动运行测试

## 📝 可用的测试脚本

```bash
# 运行所有测试
npm test
# 或
pnpm test

# 监听模式运行测试（开发时使用）
npm run test:watch
# 或
pnpm test:watch

# 使用 UI 界面运行测试
npm run test:ui
# 或
pnpm test:ui

# 运行测试并生成覆盖率报告
npm run test:coverage
# 或
pnpm test:coverage
```

## 🔧 Pre-commit Hook 工作流程

每次 `git commit` 时，pre-commit hook 会自动：

1. **运行 lint-staged**：
   - 对暂存的 `.js`, `.ts`, `.vue` 文件运行 ESLint 并自动修复
   - 使用 Prettier 格式化所有相关文件

2. **运行所有测试**：
   - 执行 `pnpm test` 运行所有测试
   - 如果有测试失败，会阻止提交并显示错误信息

3. **如果所有检查通过**：
   - 显示 "✅ All checks passed!" 并允许提交

## 📁 测试文件位置

测试文件应该放在与被测试文件相同或相邻的位置：

```
项目结构示例：
├── utils/
│   ├── helper.ts
│   └── helper.test.ts        # 测试文件
├── components/
│   ├── Button.vue
│   └── Button.test.ts        # 测试文件
└── server/
    └── api/
        ├── notes.ts
        └── notes.test.ts     # 测试文件
```

测试文件命名规范：
- `*.test.ts` 或 `*.test.js`
- `*.spec.ts` 或 `*.spec.js`

## 📝 编写测试示例

### 工具函数测试

```typescript
import { describe, it, expect } from 'vitest'

function add(a: number, b: number): number {
  return a + b
}

describe('add function', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
```

### Vue 组件测试

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '~/components/MyComponent.vue'

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { message: 'Hello' }
    })
    expect(wrapper.text()).toContain('Hello')
  })
})
```

### API 路由测试

```typescript
import { describe, it, expect } from 'vitest'

describe('API Routes', () => {
  it('should handle GET /api/notes', async () => {
    // Mock Supabase client and test API
    // 注意：需要 mock Supabase 客户端
  })
})
```

## 🚀 开始编写测试

1. **创建测试文件**：在与被测试文件相同目录下创建 `*.test.ts` 文件

2. **编写测试用例**：使用 `describe` 和 `it` 组织测试

3. **运行测试**：
   ```bash
   pnpm test:watch  # 开发时使用监听模式
   ```

4. **提交代码**：pre-commit hook 会自动运行测试

## ⚙️ 测试配置

测试配置在 `vitest.config.ts` 中：

- **环境**: `happy-dom` (轻量级 DOM 环境)
- **超时时间**: 10 秒
- **覆盖率排除**: `node_modules`, `.nuxt`, `.output`, `server/articles`, `rare_disease_bot` 等

## 📊 覆盖率报告

运行 `pnpm test:coverage` 后，覆盖率报告会生成在 `coverage/` 目录：

- `coverage/index.html` - HTML 报告（在浏览器中打开查看）
- `coverage/coverage-final.json` - JSON 报告
- `coverage/lcov.info` - LCOV 报告（用于 CI/CD）

## ❓ 常见问题

### Q: 测试运行太慢怎么办？

A: Pre-commit hook 中运行所有测试是为了确保没有破坏现有功能。如果测试运行时间过长，可以考虑：
- 优化测试用例，减少不必要的等待
- 使用 mock 替代真实 API 调用
- 只运行相关测试（需要手动配置）

### Q: 如何跳过 pre-commit hook？

A: 不推荐，但如果必须跳过（紧急情况），使用：
```bash
git commit --no-verify
```

### Q: 测试失败但我想先提交怎么办？

A: 修复测试后再提交。如果测试失败，说明代码可能有问题，应该先修复。

### Q: 如何只运行特定测试文件？

A: 
```bash
pnpm test utils/example.test.ts
```

### Q: 如何调试测试？

A: 使用 `test:watch` 模式，Vitest 会在文件更改时自动重新运行测试。

## 🔗 相关资源

- [Vitest 文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://vitest.dev/guide/best-practices.html)
