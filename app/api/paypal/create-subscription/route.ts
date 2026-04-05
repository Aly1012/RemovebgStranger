import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createSubscription, SubscriptionPlanKey } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await req.json()
  if (plan !== 'pro' && plan !== 'pro_plus') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  try {
    const result = await createSubscription(plan as SubscriptionPlanKey, userId)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[PayPal] createSubscription failed:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
