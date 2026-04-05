'use client'
import { signIn } from 'next-auth/react'

interface Props {
  locale: 'en' | 'zh'
  reason: 'quota' | 'upgrade'
  plan: string
  onClose: () => void
}

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    quota: '5 / month',
    quotaZh: '5次/月',
    features: ['5 removals/month', '+ 3 bonus on signup', 'Standard quality', 'PNG download'],
    featuresZh: ['每月5次', '注册赠3次', '标准质量', 'PNG下载'],
    cta: 'Current Plan',
    ctaZh: '当前套餐',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$9.9',
    period: '/mo',
    quota: '200 / month',
    quotaZh: '200次/月',
    features: ['200 removals/month', 'High quality', 'Priority processing', 'PNG download'],
    featuresZh: ['每月200次', '高质量输出', '优先处理', 'PNG下载'],
    cta: 'Upgrade to Pro',
    ctaZh: '升级 Pro',
    highlight: true,
  },
  {
    key: 'pro_plus',
    name: 'Pro+',
    price: '$19.9',
    period: '/mo',
    quota: 'Unlimited',
    quotaZh: '无限次',
    features: ['Unlimited removals', 'Highest quality', 'Priority processing', 'Bulk (coming soon)'],
    featuresZh: ['无限次', '最高质量', '优先处理', '批量处理（即将上线）'],
    cta: 'Upgrade to Pro+',
    ctaZh: '升级 Pro+',
    highlight: false,
  },
]

const CREDITS = [
  { credits: 20,  price: '$2.9',  per: '$0.15/use', perZh: '$0.15/次' },
  { credits: 80,  price: '$7.9',  per: '$0.10/use', perZh: '$0.10/次', badge: 'Popular' },
  { credits: 200, price: '$14.9', per: '$0.07/use', perZh: '$0.07/次', badge: 'Best Value' },
]

export default function UpgradeModal({ locale, reason, plan, onClose }: Props) {
  const t = (en: string, zh: string) => locale === 'zh' ? zh : en

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, maxWidth: 760, width: '100%',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
        padding: '32px',
      }} onClick={e => e.stopPropagation()}>

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {reason === 'quota' ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                {t("You've used all your credits", '次数已用完')}
              </h2>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                {plan === 'guest'
                  ? t(
                      'Sign in to get 5 free uses/month + 3 bonus credits on signup.',
                      '登录可获得每月5次免费额度，注册还额外赠送3次。'
                    )
                  : t(
                      'Upgrade to Pro for unlimited removals.',
                      '升级 Pro 套餐，无限次消除路人。'
                    )
                }
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💎</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                {t('Upgrade Your Plan', '升级套餐')}
              </h2>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                {t('Remove more strangers from your photos.', '从照片中消除更多路人。')}
              </p>
            </>
          )}
        </div>

        {/* 未登录：先引导登录 */}
        {plan === 'guest' && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
            border: '1.5px solid #c7d2fe',
            borderRadius: 12, padding: '16px 20px',
            marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#2563eb' }}>
                {t('Sign in Free — 5 uses/month + 3 bonus credits', '免费登录 — 每月5次 + 注册送3次')}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {t('No credit card required', '无需信用卡，立即开始')}
              </div>
            </div>
            <button
              onClick={() => signIn('google')}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: '1.5px solid #2563eb', background: '#fff',
                color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('Sign in with Google', '用 Google 登录')}
            </button>
          </div>
        )}

        {/* 订阅套餐卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {PLANS.map(p => (
            <div key={p.key} style={{
              border: p.highlight ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
              borderRadius: 14, padding: '20px 16px',
              position: 'relative',
              background: p.highlight ? '#eff6ff' : '#fff',
            }}>
              {p.highlight && (
                <div style={{
                  position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {t('Most Popular', '最受欢迎')}
                </div>
              )}
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>{p.name}</div>
              <div style={{ marginTop: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>{p.price}</span>
                <span style={{ fontSize: 13, color: '#888' }}>{p.period}</span>
              </div>
              <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginBottom: 12 }}>
                {t(p.quota, p.quotaZh)}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', fontSize: 12, color: '#555' }}>
                {(locale === 'zh' ? p.featuresZh : p.features).map((f, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>✓ {f}</li>
                ))}
              </ul>
              <button
                disabled={p.key === 'free' && plan !== 'guest'}
                style={{
                  width: '100%', padding: '8px', borderRadius: 8,
                  border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: p.key === 'free' && plan !== 'guest' ? 'default' : 'pointer',
                  background: p.key === 'free' ? '#e5e7eb'
                    : p.highlight ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                    : '#111',
                  color: p.key === 'free' ? '#999' : '#fff',
                  opacity: p.key === 'free' && plan !== 'guest' ? 0.6 : 1,
                }}
              >
                {t(p.cta, p.ctaZh)}
              </button>
            </div>
          ))}
        </div>

        {/* 分割线 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>
            {t('OR BUY CREDITS (never expire)', '或者购买积分（永久有效）')}
          </span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* 积分包 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {CREDITS.map(c => (
            <div key={c.credits} style={{
              border: c.badge === 'Popular' ? '2px solid #f59e0b' : '1.5px solid #e5e7eb',
              borderRadius: 12, padding: '14px 12px', textAlign: 'center',
              position: 'relative', background: '#fff',
            }}>
              {c.badge && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: c.badge === 'Popular' ? '#f59e0b' : '#10b981',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {c.badge}
                </div>
              )}
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{c.credits}</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                {t('credits', '积分')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 4 }}>{c.price}</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
                {t(c.per, c.perZh)}
              </div>
              <button style={{
                width: '100%', padding: '7px', borderRadius: 8,
                border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: '#111', color: '#fff',
              }}>
                {t('Buy', '购买')}
              </button>
            </div>
          ))}
        </div>

        {/* PayPal 提示 */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', margin: '16px 0 0' }}>
          {t('Payments powered by PayPal · Secure · 7-day refund', '支付由 PayPal 提供 · 安全 · 7天退款')}
        </p>

        {/* 关闭 */}
        <button
          onClick={onClose}
          style={{
            display: 'block', margin: '12px auto 0',
            background: 'none', border: 'none',
            color: '#aaa', fontSize: 13, cursor: 'pointer',
          }}
        >
          {t('Maybe later', '稍后再说')}
        </button>
      </div>
    </div>
  )
}
