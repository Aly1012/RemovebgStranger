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
export async function createOrder(credits: CreditPackCredits): Promise<{ id: string }> {
  const pack = getCreditPack(credits)
  if (!pack) throw new Error(`Invalid credit pack: ${credits}`)

  const token = await getPayPalToken()

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `credits-${credits}-${Date.now()}`, // 幂等 key
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: pack.price,
          },
          description: pack.description,
          custom_id: String(credits), // 用于 capture 时识别积分数量
        },
      ],
      application_context: {
        brand_name: 'NoBGStranger',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXTAUTH_URL}/api/paypal/capture-order`,
        cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal createOrder error: ${err}`)
  }

  return res.json()
}

// ── Capture Order（确认付款）─────────────────────────
export async function captureOrder(orderId: string): Promise<{
  status: string
  customId: string   // 积分数量
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

  return {
    status: data.status,
    customId: unit?.custom_id ?? '',
    payerEmail: data.payer?.email_address ?? '',
    amount: capture?.amount?.value ?? '0',
  }
}
