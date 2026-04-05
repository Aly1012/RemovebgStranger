'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [show, setShow] = useState(false)

  const type = searchParams.get('type') || 'credits'   // credits | subscription
  const added = parseInt(searchParams.get('added') || '0', 10)
  const plan = searchParams.get('plan') || ''
  const balance = parseInt(searchParams.get('balance') || '0', 10)

  useEffect(() => {
    // 没有合法参数 → 跳回首页
    if (!type) { router.replace('/'); return }
    // 动画延迟出现
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  const isCredits = type === 'credits'
  const planLabel = plan === 'pro_plus' ? 'Pro+' : 'Pro'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '24px',
    }}>
      {/* 卡片 */}
      <div style={{
        background: '#fff', borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
        padding: '48px 40px', maxWidth: 440, width: '100%',
        textAlign: 'center',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* 图标 */}
        <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>
          {isCredits ? '🎉' : '🚀'}
        </div>

        {/* 标题 */}
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
          Payment Successful!
        </h1>

        {/* 积分或订阅信息 */}
        {isCredits ? (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', margin: '0 0 6px' }}>
              +{added} credits added to your account.
            </p>
            {balance > 0 && (
              <p style={{ fontSize: 14, color: '#888', margin: '0 0 32px' }}>
                New balance: {balance} credits
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed', margin: '0 0 6px' }}>
              Welcome to {planLabel}! 🎊
            </p>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 32px' }}>
              Your subscription is now active.
            </p>
          </>
        )}

        {/* 进度条动画（积分时显示） */}
        {isCredits && balance > 0 && (
          <div style={{
            width: '100%', height: 8, background: '#e5e7eb',
            borderRadius: 4, overflow: 'hidden', margin: '0 0 32px',
          }}>
            <div style={{
              height: '100%',
              width: show ? `${Math.min((balance / (balance + 20)) * 100, 100)}%` : '0%',
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
              borderRadius: 4,
              transition: 'width 1s ease 0.3s',
            }} />
          </div>
        )}

        {/* 返回首页按钮 */}
        <Link href="/" style={{
          display: 'block', padding: '14px 0', borderRadius: 12,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#fff', fontSize: 16, fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Start Removing Background Strangers →
        </Link>

        {/* 次级链接 */}
        <p style={{ marginTop: 16, fontSize: 13, color: '#aaa' }}>
          <Link href="/pricing" style={{ color: '#2563eb', textDecoration: 'none' }}>
            View pricing
          </Link>
          {' · '}
          <Link href="/" style={{ color: '#aaa', textDecoration: 'none' }}>
            Back to home
          </Link>
        </p>
      </div>

      {/* 底部 Logo */}
      <p style={{ marginTop: 24, fontSize: 13, color: '#aaa' }}>
        🧹 RemovebgStranger
      </p>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32 }}>🎉</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
