import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getUsageInfo } from '@/lib/quota'

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '0.0.0.0'
  )
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  const userId = (session?.user as any)?.id ?? null
  const ip = getClientIp(req)
  const info = getUsageInfo(userId, ip)
  return NextResponse.json(info)
}
