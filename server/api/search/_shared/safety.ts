export interface SafetyResult {
  risky: boolean
  response?: string
}

const HIGH_RISK_PATTERNS = [/自杀/, /伤害自己/, /hurt myself/i, /kill myself/i, /不想活了/]

export async function detectSearchSafetyRisk(message: string): Promise<SafetyResult> {
  const risky = HIGH_RISK_PATTERNS.some(pattern => pattern.test(message))

  if (!risky) {
    return { risky: false }
  }

  return {
    risky: true,
    response:
      '你的安全最重要。请立刻联系当地急救电话、身边可信任的人，或尽快前往最近的医院急诊/心理危机支持机构寻求面对面帮助。',
  }
}
