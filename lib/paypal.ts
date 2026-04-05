// PayPal REST API 工具库
// 文档：https://developer.paypal.com/docs/api/orders/v2/

const BASE_URL =
  process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

// ── 获取 Access Token ─────────────────────────────────
let _tokenCache: { token: string; expiresAt: number } | null = null

export async function getPayPalToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!
  const secret = process.env.PAYPAL_CLIENT_SECRET!
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal token error: ${err}`)
  }

  const data = await res.json()
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 提前1分钟过期
  }
  return _tokenCache.token
}

// ── 积分包定义（与前端/定价页保持一致）────────────────
export const CREDIT_PACKS = [
  { credits: 20,  price: '2.90',  description: '20 Credits - NoBGStranger' },
  { credits: 80,  price: '7.90',  description: '80 Credits - NoBGStranger' },
  { credits: 200, price: '14.90', description: '200 Credits - NoBGStranger' },
] as const

export type CreditPackCredits = typeof CREDIT_PACKS[number]['credits']

export function getCreditPack(credits: CreditPackCredits) {
  return CREDIT_PACKS.find(p => p.credits === credits)
}

// ── 创建 Order（积分包一次性付款）───────────────────────
export async function createOrder(credits: CreditPackCredits, userId: string): Promise<{
  id: string
  approveUrl: string
}> {
  const pack = getCreditPack(credits)
  if (!pack) throw new Error(`Invalid credit pack: ${credits}`)

  const token = await getPayPalToken()
  // 把 userId 和 credits 写入 return_url query，不依赖 custom_id（沙盒有时不返回）
  const returnUrl = `${process.env.NEXTAUTH_URL}/api/paypal/capture-order?credits=${credits}&uid=${encodeURIComponent(userId)}`
  const cancelUrl = `${process.env.NEXTAUTH_URL}/pricing`

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `credits-${credits}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'USD', value: pack.price },
          description: pack.description,
          custom_id: `${userId}|${credits}`,  // userId|credits，回调时解析
        },
      ],
      application_context: {
        brand_name: 'NoBGStranger',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal createOrder error: ${err}`)
  }

  const data = await res.json()
  const approveUrl = data.links?.find((l: any) => l.rel === 'approve')?.href
  if (!approveUrl) throw new Error('No approve link in PayPal response')

  return { id: data.id, approveUrl }
}

// ── Capture Order（确认付款）─────────────────────────
export async function captureOrder(orderId: string): Promise<{
  status: string
  customId: string   // 格式：userId|credits
  userId: string
  credits: number
  payerEmail: string
  amount: string
}> {
  const token = await getPayPalToken()

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal captureOrder error: ${err}`)
  }

  const data = await res.json()
  const unit = data.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const customId: string = unit?.custom_id ?? ''

  // 解析 custom_id：userId|credits
  const [parsedUserId, parsedCredits] = customId.split('|')

  return {
    status: data.status,
    customId,
    userId: parsedUserId ?? '',
    credits: parseInt(parsedCredits ?? '0', 10),
    payerEmail: data.payer?.email_address ?? '',
    amount: capture?.amount?.value ?? '0',
  }
}

// ── 订阅相关 ─────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  pro:      { planId: process.env.PAYPAL_PLAN_PRO!,      price: '9.90',  label: 'Pro' },
  pro_plus: { planId: process.env.PAYPAL_PLAN_PRO_PLUS!, price: '19.90', label: 'Pro+' },
} as const

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS

// 创建订阅（返回 subscription id + approve link）
export async function createSubscription(planKey: SubscriptionPlanKey, userId: string): Promise<{
  subscriptionId: string
  approveUrl: string
}> {
  const plan = SUBSCRIPTION_PLANS[planKey]
  if (!plan?.planId) throw new Error(`Plan ID not configured for ${planKey}`)

  const token = await getPayPalToken()
  const returnUrl = `${process.env.NEXTAUTH_URL}/api/paypal/subscription-return?plan=${planKey}`
  const cancelUrl = `${process.env.NEXTAUTH_URL}/pricing`

  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `sub-${userId}-${planKey}-${Date.now()}`,
    },
    body: JSON.stringify({
      plan_id: plan.planId,
      custom_id: `${userId}|${planKey}`,  // 回调时识别用户 + 套餐
      application_context: {
        brand_name: 'NoBGStranger',
        landing_page: 'LOGIN',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal createSubscription error: ${err}`)
  }

  const data = await res.json()
  const approveLink = data.links?.find((l: any) => l.rel === 'approve')?.href
  if (!approveLink) throw new Error('No approve link in PayPal response')

  return { subscriptionId: data.id, approveUrl: approveLink }
}

// 查询订阅详情
export async function getSubscription(subscriptionId: string): Promise<{
  status: string
  customId: string
  nextBillingTime: string | null
}> {
  const token = await getPayPalToken()
  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`PayPal getSubscription error: ${await res.text()}`)

  const data = await res.json()
  return {
    status: data.status,
    customId: data.custom_id ?? '',
    nextBillingTime: data.billing_info?.next_billing_time ?? null,
  }
}
