import { getDb } from './db'

// ── 配额定义 ──────────────────────────────────────────
export const QUOTA = {
  guest:    { limit: 2,   window: 'month' },  // 未登录：2次/月（按IP）
  free:     { limit: 5,   window: 'month' },  // 登录免费：5次/月（+注册送3积分）
  pro:      { limit: 200, window: 'month' },  // Pro $9.9：200次/月
  pro_plus: { limit: -1,  window: 'month' },  // Pro+ $19.9：无限
} as const

export const SIGNUP_BONUS_CREDITS = 3  // 注册一次性赠送

export type Plan = keyof typeof QUOTA

// ── 公共：计算用户当前有效套餐 ────────────────────────
export function getEffectivePlan(user: {
  plan?: string | null
  plan_expires_at?: number | null
}): Plan {
  const plan = (user.plan as Plan) || 'free'
  if (plan === 'pro' || plan === 'pro_plus') {
    const expired = user.plan_expires_at && user.plan_expires_at < Date.now() / 1000
    if (expired) return 'free'
  }
  return plan
}

// ── 月初时间戳（秒） ──────────────────────────────────
export function getWindowStart(): number {
  const now = new Date()
  return Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
}

// ── 查询月度已用次数（不消耗）────────────────────────
export function getMonthlyUsed(userId: string): number {
  const db = getDb()
  const windowStart = getWindowStart()
  return (db.prepare(
    'SELECT COUNT(*) as cnt FROM usage_logs WHERE user_id = ? AND created_at >= ?'
  ).get(userId, windowStart) as any).cnt
}

export function getMonthlyUsedByIp(ip: string): number {
  const db = getDb()
  const windowStart = getWindowStart()
  return (db.prepare(
    'SELECT COUNT(*) as cnt FROM usage_logs WHERE user_id IS NULL AND ip = ? AND created_at >= ?'
  ).get(ip, windowStart) as any).cnt
}

// ── 查询用量信息（不消耗）────────────────────────────
export interface UsageInfo {
  used: number
  limit: number
  plan: Plan
  credits: number
  planExpiresAt: number | null
}

export function getUsageInfo(userId: string | null, ip: string): UsageInfo {
  const db = getDb()

  if (userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) return { used: 0, limit: QUOTA.free.limit, plan: 'free', credits: 0, planExpiresAt: null }

    const effectivePlan = getEffectivePlan(user)
    const credits = user.credits ?? 0

    if (effectivePlan === 'pro_plus') {
      return { used: 0, limit: -1, plan: effectivePlan, credits, planExpiresAt: user.plan_expires_at ?? null }
    }

    const quota = QUOTA[effectivePlan]
    const used = getMonthlyUsed(userId)

    return { used, limit: quota.limit, plan: effectivePlan, credits, planExpiresAt: user.plan_expires_at ?? null }

  } else {
    const quota = QUOTA.guest
    const used = getMonthlyUsedByIp(ip)
    return { used, limit: quota.limit, plan: 'guest', credits: 0, planExpiresAt: null }
  }
}

// ── 检查并消耗一次额度 ────────────────────────────────
export interface ConsumeResult {
  allowed: boolean
  used: number
  limit: number
  plan: Plan
  credits: number
  reason?: string
}

export function checkAndConsume(
  userId: string | null,
  ip: string
): ConsumeResult {
  const db = getDb()

  if (userId) {
    // 确保用户记录存在
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      db.prepare(`INSERT OR IGNORE INTO users (id, email) VALUES (?, '')`).run(userId)
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    }

    const effectivePlan = getEffectivePlan(user)
    const credits = user.credits ?? 0

    // Pro+ 无限
    if (effectivePlan === 'pro_plus') {
      db.prepare('INSERT INTO usage_logs (user_id, ip) VALUES (?, ?)').run(userId, ip)
      const used = getMonthlyUsed(userId)
      return { allowed: true, used, limit: -1, plan: effectivePlan, credits }
    }

    // 优先消耗积分（永久有效，注册赠送 or 购买）
    if (credits > 0) {
      db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(userId)
      db.prepare('INSERT INTO usage_logs (user_id, ip) VALUES (?, ?)').run(userId, ip)
      const newCredits = credits - 1
      const used = getMonthlyUsed(userId)
      return { allowed: true, used, limit: QUOTA[effectivePlan].limit, plan: effectivePlan, credits: newCredits }
    }

    // 月度配额
    const quota = QUOTA[effectivePlan]
    const used = getMonthlyUsed(userId)

    if (used >= quota.limit) {
      return { allowed: false, used, limit: quota.limit, plan: effectivePlan, credits, reason: 'quota_exceeded' }
    }

    db.prepare('INSERT INTO usage_logs (user_id, ip) VALUES (?, ?)').run(userId, ip)
    return { allowed: true, used: used + 1, limit: quota.limit, plan: effectivePlan, credits }

  } else {
    // 未登录访客：按 IP，2次/月
    const quota = QUOTA.guest
    const used = getMonthlyUsedByIp(ip)

    if (used >= quota.limit) {
      return { allowed: false, used, limit: quota.limit, plan: 'guest', credits: 0, reason: 'quota_exceeded' }
    }

    db.prepare('INSERT INTO usage_logs (user_id, ip) VALUES (NULL, ?)').run(ip)
    return { allowed: true, used: used + 1, limit: quota.limit, plan: 'guest', credits: 0 }
  }
}
