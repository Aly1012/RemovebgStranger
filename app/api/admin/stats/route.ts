import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getWindowStart } from '@/lib/quota'

// 简单 token 鉴权：?token=YOUR_ADMIN_TOKEN
// 或 Header: Authorization: Bearer YOUR_ADMIN_TOKEN
function isAuthorized(req: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken) return false  // 未配置 token 则拒绝所有请求

  const queryToken = req.nextUrl.searchParams.get('token')
  const headerToken = req.headers.get('authorization')?.replace('Bearer ', '')

  return queryToken === adminToken || headerToken === adminToken
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const windowStart = getWindowStart()

  // 总体统计
  const totalUsers = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt
  const proUsers = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro' AND (plan_expires_at IS NULL OR plan_expires_at > unixepoch())").get() as any).cnt
  const proPlusUsers = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE plan = 'pro_plus' AND (plan_expires_at IS NULL OR plan_expires_at > unixepoch())").get() as any).cnt
  const freeUsers = totalUsers - proUsers - proPlusUsers

  // 本月用量
  const monthlyTotal = (db.prepare(
    'SELECT COUNT(*) as cnt FROM usage_logs WHERE created_at >= ?'
  ).get(windowStart) as any).cnt

  const monthlyGuest = (db.prepare(
    'SELECT COUNT(*) as cnt FROM usage_logs WHERE user_id IS NULL AND created_at >= ?'
  ).get(windowStart) as any).cnt

  const monthlyLoggedIn = monthlyTotal - monthlyGuest

  // 今日用量
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  const todayTotal = (db.prepare(
    'SELECT COUNT(*) as cnt FROM usage_logs WHERE created_at >= ?'
  ).get(todayStart) as any).cnt

  // 最近 10 个注册用户
  const recentUsers = db.prepare(
    'SELECT id, email, name, plan, credits, created_at FROM users ORDER BY created_at DESC LIMIT 10'
  ).all()

  // 最近 20 条使用记录
  const recentLogs = db.prepare(`
    SELECT ul.id, ul.user_id, ul.ip, ul.created_at, u.email, u.plan
    FROM usage_logs ul
    LEFT JOIN users u ON ul.user_id = u.id
    ORDER BY ul.created_at DESC LIMIT 20
  `).all()

  return NextResponse.json({
    users: { total: totalUsers, free: freeUsers, pro: proUsers, pro_plus: proPlusUsers },
    usage: {
      month: { total: monthlyTotal, loggedIn: monthlyLoggedIn, guest: monthlyGuest },
      today: { total: todayTotal },
    },
    recentUsers,
    recentLogs,
  })
}
