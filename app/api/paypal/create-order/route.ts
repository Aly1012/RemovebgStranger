import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createOrder, CreditPackCredits } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { credits } = await req.json()
  const validPacks: CreditPackCredits[] = [20, 80, 200]
  if (!validPacks.includes(credits)) {
    return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 })
  }

  try {
    // userId 写入 custom_id，回调时不依赖 session
    const order = await createOrder(credits as CreditPackCredits, userId)
    return NextResponse.json({ orderId: order.id, approveUrl: order.approveUrl })
  } catch (e) {
    console.error('[PayPal] createOrder failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
