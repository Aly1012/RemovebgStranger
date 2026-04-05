import { NextRequest, NextResponse } from 'next/server'
import { captureOrder } from '@/lib/paypal'
import { getDb } from '@/lib/db'

// ── GET：PayPal 跳转模式回调 ──────────────────────────
// PayPal 跳回：/api/paypal/capture-order?token=ORDER_ID&uid=USER_ID&credits=20
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orderId = searchParams.get('token')   // PayPal 用 token 参数传 order id
  const userId = searchParams.get('uid')       // 从 return_url 里取，比 custom_id 更可靠
  const creditsParam = searchParams.get('credits')

  console.log('[PayPal] capture-order GET:', { orderId, userId, creditsParam })

  if (!orderId) {
    return NextResponse.redirect(new URL('/pricing?error=missing_order', req.url))
  }
  if (!userId) {
    return NextResponse.redirect(new URL('/pricing?error=not_logged_in', req.url))
  }

  try {
    const result = await captureOrder(orderId)
    console.log('[PayPal] captureOrder result:', result.status, 'customId:', result.customId)

    if (result.status !== 'COMPLETED') {
      return NextResponse.redirect(new URL(`/pricing?error=not_completed`, req.url))
    }

    // 优先从 URL query 取 credits
    const creditsToAdd = parseInt(creditsParam || result.credits?.toString() || '0', 10)
    if (!creditsToAdd || creditsToAdd <= 0) {
      return NextResponse.redirect(new URL('/pricing?error=invalid_credits', req.url))
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM payment_logs WHERE paypal_order_id = ?').get(orderId)

    if (!existing) {
      const addCredits = db.transaction(() => {
        db.prepare(`
          INSERT INTO payment_logs (user_id, paypal_order_id, type, credits, amount_usd, payer_email)
          VALUES (?, ?, 'credits', ?, ?, ?)
        `).run(userId, orderId, creditsToAdd, result.amount, result.payerEmail)
        db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(creditsToAdd, userId)
      })
      addCredits()
      console.log(`[PayPal] ✅ ${userId} bought ${creditsToAdd} credits ($${result.amount})`)
    }

    // 查询最新余额
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as any
    const newBalance = user?.credits ?? creditsToAdd

    return NextResponse.redirect(new URL(
      `/payment-success?type=credits&added=${creditsToAdd}&balance=${newBalance}`,
      req.url
    ))
  } catch (e) {
    console.error('[PayPal] capture GET error:', e)
    return NextResponse.redirect(new URL('/pricing?error=server_error', req.url))
  }
}

// ── POST：兼容备用 ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const { orderId } = await req.json()
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  try {
    const result = await captureOrder(orderId)
    if (result.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Payment not completed: ${result.status}` }, { status: 400 })
    }

    const { userId, credits: creditsToAdd } = result
    if (!userId || !creditsToAdd) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM payment_logs WHERE paypal_order_id = ?').get(orderId)
    if (existing) {
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as any
      return NextResponse.json({ success: true, credits: user?.credits ?? 0, duplicate: true })
    }

    const addCredits = db.transaction(() => {
      db.prepare(`
        INSERT INTO payment_logs (user_id, paypal_order_id, type, credits, amount_usd, payer_email)
        VALUES (?, ?, 'credits', ?, ?, ?)
      `).run(userId, orderId, creditsToAdd, result.amount, result.payerEmail)
      db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(creditsToAdd, userId)
    })
    addCredits()

    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as any
    return NextResponse.json({ success: true, creditsAdded: creditsToAdd, credits: user?.credits ?? 0 })
  } catch (e) {
    console.error('[PayPal] captureOrder POST failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
