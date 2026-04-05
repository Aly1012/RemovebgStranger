'use client'
import { useState } from 'react'

interface Props {
  credits: 20 | 80 | 200
  price: string
  locale: 'en' | 'zh'
  onSuccess?: (creditsAdded: number, newTotal: number) => void
}

export default function BuyCreditsButton({ credits, price, locale }: Props) {
  const t = (en: string, zh: string) => locale === 'zh' ? zh : en
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBuy = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')
      // 直接跳转到 PayPal 付款页，不用弹窗
      window.location.href = data.approveUrl
    } catch (e) {
      setLoading(false)
      setError(t('Failed to connect PayPal, please retry', '连接 PayPal 失败，请重试'))
    }
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 8,
          border: 'none',
          background: loading ? '#d1d5db' : 'linear-gradient(135deg, #003087, #009cde)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {loading ? (
          t('Redirecting...', '跳转中...')
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M7.5 3h9C19.5 3 21 4.5 21 7.5c0 4.5-3 6-6 6H13l-1 5H8l2.5-12H7.5V3z
                M10.5 6L9 12h3c2 0 3.5-1 3.5-3.5S14 6 12 6h-1.5z" opacity="0.9"/>
            </svg>
            {t('Pay with PayPal', '用 PayPal 付款')} · {price}
          </>
        )}
      </button>
      {error && (
        <p style={{ color: '#ef4444', fontSize: 12, margin: '6px 0 0', textAlign: 'center' }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}
