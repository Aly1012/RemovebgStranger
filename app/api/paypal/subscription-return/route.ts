import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getSubscription } from '@/lib/paypal'
import { getDb } from '@/lib/db'

// PayPal 订阅确认后跳回这里：/api/paypal/subscription-return?plan=pro&subscription_id=I-xxx
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const subscriptionId = searchParams.get('subscription_id')
  const planKey = searchParams.get('plan') // pro | pro_plus

  if (!subscriptionId || !planKey) {
    return NextResponse.redirect(new URL('/pricing?error=missing_params', req.url))
  }

  const session = await getServerSession()
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.redirect(new URL('/pricing?error=not_logged_in', req.url))
  }

  try {
    // 向 PayPal 确认订阅状态
    const sub = await getSubscription(subscriptionId)

    if (sub.status !== 'ACTIVE') {
      console.warn(`[PayPal] Subscription ${subscriptionId} status: ${sub.status}`)
      return NextResponse.redirect(new URL('/pricing?error=not_active', req.url))
    }

    const db = getDb()

    // 幂等：已处理过直接跳成功
    const existing = db.prepare(
      'SELECT id FROM payment_logs WHERE paypal_order_id = ?'
    ).get(subscriptionId)

    if (!existing) {
      // 计算到期时间（沙盒：1个月后）
      const expiresAt = sub.nextBillingTime
        ? Math.floor(new Date(sub.nextBillingTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 30 * 24 * 3600

      const activate = db.transaction(() => {
        // 更新用户套餐
        db.prepare(`
          UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?
        `).run(planKey, expiresAt, userId)

        // 写支付记录
        db.prepare(`
          INSERT INTO payment_logs (user_id, paypal_order_id, type, amount_usd)
          VALUES (?, ?, 'subscription', ?)
        `).run(userId, subscriptionId, planKey === 'pro' ? '9.90' : '19.90')
      })

      activate()
      console.log(`[PayPal] ✅ ${userId} subscribed to ${planKey} (${subscriptionId})`)
    }

    // 跳回定价页，带成功标志
    return NextResponse.redirect(new URL(`/pricing?success=subscribed&plan=${planKey}`, req.url))
  } catch (e) {
    console.error('[PayPal] subscription-return error:', e)
    return NextResponse.redirect(new URL('/pricing?error=server_error', req.url))
  }
}
