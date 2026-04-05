import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { captureOrder } from '@/lib/paypal'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  // 必须登录
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

    // 幂等检查：防止重复发放（检查 order_id 是否已处理）
    const db = getDb()
    const existing = db.prepare(
      'SELECT id FROM payment_logs WHERE paypal_order_id = ?'
    ).get(orderId)

    if (existing) {
      // 已处理过，直接返回当前积分
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId) as any
      return NextResponse.json({ success: true, credits: user?.credits ?? 0, duplicate: true })
    }

    // 写入支付记录 + 给用户加积分（事务）
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

    return NextResponse.json({
      success: true,
      creditsAdded: creditsToAdd,
      credits: user?.credits ?? 0,
    })
  } catch (e) {
    console.error('[PayPal] captureOrder failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
