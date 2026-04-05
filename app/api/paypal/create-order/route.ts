import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createOrder, CreditPackCredits } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  // 必须登录
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { credits } = await req.json()

  // 校验积分数量合法
  const validPacks: CreditPackCredits[] = [20, 80, 200]
  if (!validPacks.includes(credits)) {
    return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 })
  }

  try {
    const order = await createOrder(credits as CreditPackCredits)
    return NextResponse.json({ orderId: order.id })
  } catch (e) {
    console.error('[PayPal] createOrder failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
