import { describe, it, expect } from 'vitest'

/**
 * 这个文件用于测试 pre-commit hook 是否正常工作
 * 包含故意的问题：
 * 1. Prettier 格式问题（缩进不一致、缺少空格）
 * 2. 一个会失败的测试
 */

// 格式问题：缺少空格、缩进不一致
const testVar = 123
function multiply(a: number, b: number): number {
  return a * b // 缩进错误
}

describe('Pre-commit 测试验证', () => {
  it('应该通过乘法测试', () => {
    expect(multiply(2, 3)).toBe(6)
  })

  it('应该正确计算 2*2', () => {
    expect(multiply(2, 2)).toBe(4)
  })
})
