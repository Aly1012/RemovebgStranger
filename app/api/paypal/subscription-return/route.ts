import { NextRequest, NextResponse } from 'next/server'
import { getSubscription } from '@/lib/paypal'
import { getDb } from '@/lib/db'

// PayPal 订阅确认后跳回：/api/paypal/subscription-return?subscription_id=I-xxx&plan=pro
// userId 从 subscription 的 custom_id 里读取（格式 userId|planKey），不依赖 session
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subscriptionId = searchParams.get('subscription_id')
  const planKey = searchParams.get('plan')

  if (!subscriptionId || !planKey) {
    return NextResponse.redirect(new URL('/pricing?error=missing_params', req.url))
  }

  try {
    const sub = await getSubscription(subscriptionId)

    if (sub.status !== 'ACTIVE') {
      console.warn(`[PayPal] Subscription ${subscriptionId} status: ${sub.status}`)
      return NextResponse.redirect(new URL('/pricing?error=not_active', req.url))
    }

    // custom_id 格式：userId|planKey
    const [userId] = (sub.customId || '').split('|')
    if (!userId) {
      console.error('[PayPal] No userId in subscription custom_id:', sub.customId)
      return NextResponse.redirect(new URL('/pricing?error=invalid_order', req.url))
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM payment_logs WHERE paypal_order_id = ?').get(subscriptionId)

    if (!existing) {
      const expiresAt = sub.nextBillingTime
        ? Math.floor(new Date(sub.nextBillingTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 30 * 24 * 3600

      const activate = db.transaction(() => {
        db.prepare(`UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?`).run(planKey, expiresAt, userId)
        db.prepare(`
          INSERT INTO payment_logs (user_id, paypal_order_id, type, amount_usd)
          VALUES (?, ?, 'subscription', ?)
        `).run(userId, subscriptionId, planKey === 'pro' ? '9.90' : '19.90')
      })
      activate()
      console.log(`[PayPal] ✅ ${userId} subscribed to ${planKey} (${subscriptionId})`)
    }

    return NextResponse.redirect(new URL(`/payment-success?type=subscription&plan=${planKey}`, req.url))
  } catch (e) {
    console.error('[PayPal] subscription-return error:', e)
    return NextResponse.redirect(new URL('/pricing?error=server_error', req.url))
  }
}
