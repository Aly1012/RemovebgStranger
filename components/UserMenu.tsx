'use client'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useUsage } from '@/lib/useUsage'

interface Props {
  locale: 'en' | 'zh'
  onUpgrade: () => void
}

export default function UserMenu({ locale, onUpgrade }: Props) {
  const { data: session } = useSession()
  const { usage } = useUsage()

  const t = (en: string, zh: string) => locale === 'zh' ? zh : en

  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8,
          border: '1.5px solid #e5e7eb', background: '#fff',
          color: '#444', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t('Sign in', '登录')}
      </button>
    )
  }

  const isProPlus = usage?.plan === 'pro_plus'
  const isPro = usage?.plan === 'pro'
  const isFree = !isPro && !isProPlus
  const usedPct = usage && usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0
  const monthRemaining = usage ? (usage.limit === -1 ? '∞' : Math.max(usage.limit - usage.used, 0)) : '...'
  const credits = usage?.credits ?? 0
  // 显示月度剩余 + 积分（如有）
  const remainingLabel = usage?.limit === -1
    ? '∞'
    : credits > 0
      ? `${monthRemaining}+${credits}`
      : `${monthRemaining}`

  const planLabel = isProPlus ? 'Pro+' : isPro ? 'Pro' : 'Free'
  const planColor = isProPlus ? '#7c3aed' : isPro ? '#2563eb' : '#6b7280'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* 用量条 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: planColor, borderRadius: 4, padding: '1px 6px',
          }}>{planLabel}</span>
          <span style={{ fontSize: 12, color: '#888' }}>
            {t(`${remainingLabel} left`, `剩余 ${remainingLabel} 次`)}
          </span>
        </div>
        {usage && usage.limit > 0 && (
          <div style={{ width: 80, height: 4, background: '#e5e7eb', borderRadius: 2 }}>
            <div style={{
              width: `${usedPct}%`, height: '100%',
              background: usedPct >= 100 ? '#ef4444' : usedPct >= 75 ? '#f59e0b' : '#2563eb',
              borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
        )}
      </div>

      {isFree && (
        <button
          onClick={onUpgrade}
          style={{
            padding: '5px 12px', borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('Upgrade', '升级')}
        </button>
      )}

      {/* 头像 + 退出 */}
      {session.user?.image && (
        <img src={session.user.image} alt="avatar"
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
          title={`${session.user.name}\n${t('Click to sign out', '点击退出')}`}
          onClick={() => signOut()}
        />
      )}
    </div>
  )
}
