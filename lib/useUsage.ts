'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { Plan } from './quota'

export interface UsageInfo {
  used: number
  limit: number
  plan: Plan
  credits: number
  planExpiresAt: number | null
}

export function useUsage() {
  const { data: session } = useSession()
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/usage')
    if (res.ok) setUsage(await res.json())
  }, [])

  // 从 remove API 响应头直接更新用量（省去额外请求）
  const updateFromHeaders = useCallback((headers: Headers) => {
    const used = headers.get('X-Quota-Used')
    const limit = headers.get('X-Quota-Limit')
    const plan = headers.get('X-Quota-Plan')
    const credits = headers.get('X-Quota-Credits')
    if (used !== null && limit !== null && plan && credits !== null) {
      setUsage(prev => prev ? {
        ...prev,
        used: Number(used),
        limit: Number(limit),
        plan: plan as Plan,
        credits: Number(credits),
      } : null)
      // 如果 prev 为 null，还是走一次完整刷新
      if (!usage) refresh()
    }
  }, [usage, refresh])

  useEffect(() => { refresh() }, [session, refresh])

  return { usage, refresh, updateFromHeaders }
}
