import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { captureOrder } from '@/lib/paypal'
import { getDb } from '@/lib/db'

// ── GET：PayPal 跳转模式回调 ──────────────────────────
// URL: /api/paypal/capture-order?token=ORDER_ID&credits=20
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const orderId = searchParams.get('token')   // PayPal 跳转回来时带的 token 就是 order id
  const credits = searchParams.get('credits')

  if (!orderId) {
    return NextResponse.redirect(new URL('/pricing?error=missing_order', req.url))
  }

  const session = await getServerSession()
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.redirect(new URL('/pricing?error=not_logged_in', req.url))
  }

  try {
    const result = await captureOrder(orderId)

    if (result.status !== 'COMPLETED') {
      return NextResponse.redirect(new URL(`/pricing?error=not_completed`, req.url))
    }

    const creditsToAdd = parseInt(result.customId || credits || '0', 10)
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

    return NextResponse.redirect(new URL(`/pricing?success=credits&added=${creditsToAdd}`, req.url))
  } catch (e) {
    console.error('[PayPal] capture GET error:', e)
    return NextResponse.redirect(new URL('/pricing?error=server_error', req.url))
  }
}

// ── POST：弹窗模式（保留兼容）────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await req.json()
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  }

  try {
    const result = await captureOrder(orderId)
    if (result.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Payment not completed: ${result.status}` }, { status: 400 })
    }

    const creditsToAdd = parseInt(result.customId, 10)
    if (!creditsToAdd || creditsToAdd <= 0) {
      return NextResponse.json({ error: 'Invalid credits in order' }, { status: 400 })
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
    console.log(`[PayPal] ✅ ${userId} bought ${creditsToAdd} credits ($${result.amount})`)
    return NextResponse.json({ success: true, creditsAdded: creditsToAdd, credits: user?.credits ?? 0 })
  } catch (e) {
    console.error('[PayPal] captureOrder POST failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
