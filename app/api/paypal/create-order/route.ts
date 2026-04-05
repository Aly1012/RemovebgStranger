import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createOrder, CreditPackCredits } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { credits } = await req.json()
  const validPacks: CreditPackCredits[] = [20, 80, 200]
  if (!validPacks.includes(credits)) {
    return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 })
  }

  try {
    const order = await createOrder(credits as CreditPackCredits)
    // 返回 orderId 和 approveUrl（跳转模式用 approveUrl）
    return NextResponse.json({ orderId: order.id, approveUrl: order.approveUrl })
  } catch (e) {
    console.error('[PayPal] createOrder failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
