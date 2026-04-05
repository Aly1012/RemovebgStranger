'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BuyCreditsButton from '@/components/BuyCreditsButton'

// ── 翻译 ──────────────────────────────────────────────
type Locale = 'en' | 'zh'
function useLang() {
  const [locale, setLocale] = useState<Locale>('en')
  const t = (en: string, zh: string) => locale === 'zh' ? zh : en
  return { locale, setLocale, t }
}

// ── 数据 ──────────────────────────────────────────────
const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    priceZh: '$0',
    period: '',
    desc: 'Get started for free',
    descZh: '免费开始使用',
    quota: '5 removals / month',
    quotaZh: '5次/月',
    features: [
      { en: '5 removals per month', zh: '每月5次' },
      { en: '+ 3 bonus credits on signup', zh: '注册即赠3次积分' },
      { en: 'Standard quality', zh: '标准质量' },
      { en: 'PNG download', zh: 'PNG格式下载' },
    ],
    cta: 'Get Started',
    ctaZh: '免费开始',
    highlight: false,
    badge: null,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$9.9',
    priceZh: '$9.9',
    period: '/mo',
    desc: 'For regular users',
    descZh: '适合日常使用',
    quota: '200 removals / month',
    quotaZh: '200次/月',
    features: [
      { en: '200 removals per month', zh: '每月200次' },
      { en: 'High quality output', zh: '高质量输出' },
      { en: 'Priority processing', zh: '优先处理队列' },
      { en: 'PNG download', zh: 'PNG格式下载' },
      { en: 'Email support', zh: '邮件支持' },
    ],
    cta: 'Subscribe Pro',
    ctaZh: '订阅 Pro',
    highlight: true,
    badge: 'Most Popular',
    badgeZh: '最受欢迎',
  },
  {
    key: 'pro_plus',
    name: 'Pro+',
    price: '$19.9',
    priceZh: '$19.9',
    period: '/mo',
    desc: 'For power users & teams',
    descZh: '适合重度用户和团队',
    quota: 'Unlimited',
    quotaZh: '无限次',
    features: [
      { en: 'Unlimited removals', zh: '无限次使用' },
      { en: 'Highest quality', zh: '最高质量输出' },
      { en: 'Priority processing', zh: '优先处理队列' },
      { en: 'PNG download', zh: 'PNG格式下载' },
      { en: 'Bulk processing (soon)', zh: '批量处理（即将上线）' },
      { en: 'Priority support', zh: '优先客服支持' },
    ],
    cta: 'Subscribe Pro+',
    ctaZh: '订阅 Pro+',
    highlight: false,
    badge: 'Best Value',
    badgeZh: '性价比最高',
  },
]

const CREDITS = [
  {
    credits: 20,
    price: '$2.9',
    per: '$0.15 / use',
    perZh: '$0.15 / 次',
    badge: null,
    badgeZh: null,
    desc: 'Try it out',
    descZh: '小量尝试',
  },
  {
    credits: 80,
    price: '$7.9',
    per: '$0.10 / use',
    perZh: '$0.10 / 次',
    badge: 'Popular',
    badgeZh: '热门',
    desc: 'Best for occasional use',
    descZh: '适合偶尔使用',
  },
  {
    credits: 200,
    price: '$14.9',
    per: '$0.07 / use',
    perZh: '$0.07 / 次',
    badge: 'Best Value',
    badgeZh: '最划算',
    desc: 'Save more per removal',
    descZh: '每次最便宜',
  },
]

// ── FAQ ───────────────────────────────────────────────
const FAQ = [
  {
    q: 'What are credits?',
    qZh: '积分是什么？',
    a: 'Credits are a one-time purchase that never expire. Each credit = 1 removal. They are used before your monthly quota.',
    aZh: '积分是一次性购买，永久有效，不会过期。每1积分可使用1次，优先于月度配额消耗。',
  },
  {
    q: 'Can I use credits and a subscription together?',
    qZh: '积分和订阅可以同时使用吗？',
    a: 'Yes! Credits are consumed first, then your monthly subscription quota kicks in.',
    aZh: '可以！积分优先消耗，用完后再扣月度配额。',
  },
  {
    q: 'What happens when my monthly quota runs out?',
    qZh: '月度配额用完怎么办？',
    a: 'You\'ll see an upgrade prompt. You can buy a credit pack to continue without waiting for the next month.',
    aZh: '会弹出升级提示，你可以购买积分包继续使用，无需等下个月重置。',
  },
  {
    q: 'Do subscriptions auto-renew?',
    qZh: '订阅会自动续费吗？',
    a: 'Yes, subscriptions renew monthly via PayPal. You can cancel anytime.',
    aZh: '是的，每月通过PayPal自动续费，可随时取消。',
  },
  {
    q: 'Can I get a refund?',
    qZh: '可以退款吗？',
    a: 'We offer refunds within 7 days if you have not used the service. Contact us at support@nobgstranger.cn.',
    aZh: '未使用的情况下7天内支持退款，请联系 support@nobgstranger.cn。',
  },
]

// ── PayPal 回调参数处理（需要 Suspense 包裹）─────────
function PayPalReturnHandler({ onMsg }: { onMsg: (msg: string) => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get('success')
    const plan = searchParams.get('plan')
    const added = searchParams.get('added')
    const error = searchParams.get('error')

    if (success === 'subscribed' && plan) {
      const label = plan === 'pro_plus' ? 'Pro+' : 'Pro'
      onMsg(`🎉 Welcome to ${label}! Your subscription is now active.`)
      router.replace('/pricing')
    } else if (success === 'credits' && added) {
      onMsg(`🎉 ${added} credits added to your account!`)
      router.replace('/pricing')
    } else if (error) {
      const msg: Record<string, string> = {
        missing_order: '⚠️ Payment error: missing order info.',
        missing_params: '⚠️ Payment error: missing parameters.',
        not_logged_in: '⚠️ Please sign in first.',
        not_active: '⚠️ Subscription not activated, please try again.',
        not_completed: '⚠️ Payment not completed.',
        invalid_credits: '⚠️ Invalid credits amount.',
        server_error: '⚠️ Server error, please contact support.',
      }
      onMsg(msg[error] || `⚠️ ${error}`)
      router.replace('/pricing')
    }
  }, [searchParams])

  return null
}

// ── 主组件 ────────────────────────────────────────────
export default function PricingPage() {
  const { locale, setLocale, t } = useLang()
  const { data: session } = useSession()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [subLoading, setSubLoading] = useState<string | null>(null)

  const handleSubscribe = async (planKey: string) => {
    if (!session) { signIn('google'); return }
    setSubLoading(planKey)
    try {
      const res = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      // 跳转到 PayPal 订阅确认页
      window.location.href = data.approveUrl
    } catch (e) {
      setSubLoading(null)
      setSuccessMsg('⚠️ ' + (e instanceof Error ? e.message : 'Failed to start subscription'))
      setTimeout(() => setSuccessMsg(''), 6000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', background: '#fff',
        borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#1a1a1a' }}>
            🧹 NoBG<span style={{ color: '#2563eb' }}>Stranger</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setLocale('en')}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
              background: locale === 'en' ? '#2563eb' : '#fff',
              color: locale === 'en' ? '#fff' : '#666',
              fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}
          >EN</button>
          <button
            onClick={() => setLocale('zh')}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
              background: locale === 'zh' ? '#2563eb' : '#fff',
              color: locale === 'zh' ? '#fff' : '#666',
              fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}
          >中文</button>
        </div>
      </nav>

      {/* PayPal 回调处理（Suspense 包裹，避免 SSR 报错） */}
      <Suspense fallback={null}>
        <PayPalReturnHandler onMsg={(msg) => {
          setSuccessMsg(msg)
          setTimeout(() => setSuccessMsg(''), 8000)
        }} />
      </Suspense>

      {/* ── Toast 提示 ── */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#052e16', color: '#bbf7d0',
          padding: '14px 24px', borderRadius: 12,
          fontSize: 14, fontWeight: 600, zIndex: 9999,
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {successMsg}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
            {t('Simple, Transparent Pricing', '简单透明的定价')}
          </h1>
          <p style={{ fontSize: 18, color: '#666', margin: 0 }}>
            {t(
              'Choose a monthly plan or buy credits — no hidden fees, cancel anytime.',
              '按月订阅或购买积分，无隐藏费用，随时可取消。'
            )}
          </p>
        </div>

        {/* ── 月订阅 ── */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 20, textAlign: 'center' }}>
          {t('Monthly Plans', '月度订阅')}
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, marginBottom: 64,
        }}>
          {PLANS.map((plan) => (
            <div key={plan.key} style={{
              background: '#fff',
              border: plan.highlight ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
              borderRadius: 16,
              padding: '28px 24px',
              position: 'relative',
              boxShadow: plan.highlight ? '0 8px 32px rgba(37,99,235,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: plan.highlight ? '#2563eb' : '#7c3aed',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {t(plan.badge, plan.badgeZh!)}
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                {t(plan.desc, plan.descZh)}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#1a1a1a' }}>{plan.price}</span>
                {plan.period && (
                  <span style={{ fontSize: 14, color: '#888' }}>{t(plan.period, plan.period)}</span>
                )}
              </div>

              {/* Quota highlight */}
              <div style={{
                background: plan.highlight ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${plan.highlight ? '#bfdbfe' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 12px', marginBottom: 20,
                fontSize: 13, fontWeight: 600,
                color: plan.highlight ? '#1d4ed8' : '#374151',
              }}>
                ✦ {t(plan.quota, plan.quotaZh)}
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: '#444', marginBottom: 8,
                  }}>
                    <span style={{ color: '#22c55e', fontSize: 15, flexShrink: 0 }}>✓</span>
                    {t(f.en, f.zh)}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.key === 'free' ? (
                <Link href="/" style={{
                  display: 'block', textAlign: 'center',
                  padding: '11px 0', borderRadius: 10,
                  border: '1.5px solid #e5e7eb', background: '#fff',
                  color: '#666', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>
                  {t(plan.cta, plan.ctaZh)}
                </Link>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={subLoading === plan.key}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 10,
                    border: 'none',
                    background: plan.highlight
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: subLoading === plan.key ? 'not-allowed' : 'pointer',
                    opacity: subLoading === plan.key ? 0.7 : 1,
                    boxShadow: plan.highlight ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {subLoading === plan.key
                    ? (t('Redirecting to PayPal...', '跳转 PayPal 中...'))
                    : (<><span style={{ marginRight: 6, fontSize: 13 }}>🅿</span>{t(plan.cta, plan.ctaZh)}</>)
                  }
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── 积分包 ── */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
          border: '1.5px solid #fed7aa', borderRadius: 20, padding: '36px 32px', marginBottom: 64,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px' }}>
              ✦ {t('Credit Packs', '积分包')}
            </h2>
            <p style={{ fontSize: 14, color: '#92400e', margin: 0 }}>
              {t(
                'One-time purchase · Credits never expire · Used before monthly quota',
                '一次性购买 · 永久有效，不会过期 · 优先于月度配额消耗'
              )}
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
          }}>
            {CREDITS.map((pack) => (
              <div key={pack.credits} style={{
                background: '#fff', borderRadius: 14,
                border: pack.badge === 'Popular' ? '2px solid #f59e0b' : '1.5px solid #fde68a',
                padding: '22px 20px', position: 'relative', textAlign: 'center',
                boxShadow: pack.badge === 'Popular' ? '0 4px 20px rgba(245,158,11,0.15)' : 'none',
              }}>
                {pack.badge && (
                  <div style={{
                    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                    background: pack.badge === 'Best Value' ? '#7c3aed' : '#f59e0b',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                  }}>
                    {t(pack.badge, pack.badgeZh!)}
                  </div>
                )}

                <div style={{ fontSize: 32, fontWeight: 800, color: '#d97706', marginBottom: 2 }}>
                  {pack.credits}
                </div>
                <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 12 }}>
                  {t('credits', '积分')}
                </div>

                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginBottom: 2 }}>
                  {pack.price}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                  {t(pack.per, pack.perZh)}
                </div>
                <div style={{ fontSize: 12, color: '#b45309', marginBottom: 18 }}>
                  {t(pack.desc, pack.descZh)}
                </div>

                {/* 已登录：PayPal 真实按钮；未登录：引导登录 */}
                {session ? (
                  <BuyCreditsButton
                    credits={pack.credits as 20 | 80 | 200}
                    price={pack.price}
                    locale={locale}
                    onSuccess={(added, total) => {
                      setSuccessMsg(
                        t(
                          `🎉 ${added} credits added! You now have ${total} credits.`,
                          `🎉 已添加 ${added} 积分！当前共 ${total} 积分。`
                        )
                      )
                      setTimeout(() => setSuccessMsg(''), 6000)
                    }}
                  />
                ) : (
                  <button
                    onClick={() => signIn('google')}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 8,
                      border: 'none', background: '#1a1a1a',
                      color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {t('Sign in to buy', '登录后购买')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 对比表 ── */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', textAlign: 'center', marginBottom: 24 }}>
            {t('Plan Comparison', '方案对比')}
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontWeight: 700, borderRadius: '8px 0 0 8px' }}>
                    {t('Feature', '功能')}
                  </th>
                  {PLANS.map(p => (
                    <th key={p.key} style={{
                      padding: '12px 16px', textAlign: 'center', color: p.highlight ? '#2563eb' : '#374151',
                      fontWeight: 700,
                    }}>{p.name}</th>
                  ))}
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#d97706', fontWeight: 700, borderRadius: '0 8px 8px 0' }}>
                    {t('Credits', '积分包')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: t('Monthly quota', '月度配额'), values: ['5', '200', t('Unlimited','无限'), t('Per pack','按包计')] },
                  { label: t('Expire', '过期'), values: [t('Monthly reset','每月重置'), t('Monthly reset','每月重置'), t('Monthly reset','每月重置'), t('Never','永不过期')] },
                  { label: t('Quality', '处理质量'), values: ['⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐'] },
                  { label: t('Priority queue', '优先队列'), values: ['—', '✓', '✓', '—'] },
                  { label: t('Bulk (soon)', '批量处理'), values: ['—', '—', '✓', '—'] },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} style={{ padding: '12px 16px', textAlign: 'center', color: v === '—' ? '#d1d5db' : '#374151' }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ maxWidth: 680, margin: '0 auto', marginBottom: 64 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', textAlign: 'center', marginBottom: 24 }}>
            {t('Frequently Asked Questions', '常见问题')}
          </h2>
          {FAQ.map((item, i) => (
            <div key={i} style={{
              borderBottom: '1px solid #e5e7eb', marginBottom: 0,
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                  {t(item.q, item.qZh)}
                </span>
                <span style={{
                  fontSize: 18, color: '#888', transition: 'transform 0.2s',
                  transform: openFaq === i ? 'rotate(45deg)' : 'none',
                }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 4px 16px', fontSize: 14, color: '#555', lineHeight: 1.6 }}>
                  {t(item.a, item.aZh)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── CTA Bottom ── */}
        <div style={{
          textAlign: 'center', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          borderRadius: 20, padding: '40px 24px', color: '#fff',
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px' }}>
            {t('Ready to remove strangers?', '准备好消除路人了吗？')}
          </h2>
          <p style={{ fontSize: 15, opacity: 0.85, margin: '0 0 24px' }}>
            {t('Start for free — no credit card required.', '免费开始使用，无需绑卡。')}
          </p>
          <Link href="/" style={{
            display: 'inline-block', padding: '13px 32px', borderRadius: 10,
            background: '#fff', color: '#1d4ed8',
            fontSize: 15, fontWeight: 800, textDecoration: 'none',
          }}>
            {t('Try it free →', '免费试用 →')}
          </Link>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center', padding: '24px', fontSize: 12, color: '#aaa',
        borderTop: '1px solid #e5e7eb', background: '#fff',
      }}>
        © 2025 NoBGStranger · <a href="mailto:support@nobgstranger.cn" style={{ color: '#aaa' }}>support@nobgstranger.cn</a>
      </footer>
    </div>
  )
}
