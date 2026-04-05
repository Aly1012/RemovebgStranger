'use client'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { useState } from 'react'

interface Props {
  credits: 20 | 80 | 200
  price: string
  locale: 'en' | 'zh'
  onSuccess: (creditsAdded: number, newTotal: number) => void
}

export default function BuyCreditsButton({ credits, price, locale, onSuccess }: Props) {
  const t = (en: string, zh: string) => locale === 'zh' ? zh : en
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!

  return (
    <PayPalScriptProvider options={{
      clientId,
      currency: 'USD',
      intent: 'capture',
    }}>
      <div>
        <PayPalButtons
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 40 }}
          disabled={loading}
          createOrder={async () => {
            setError('')
            setLoading(true)
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credits }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create order')
            return data.orderId
          }}
          onApprove={async (data) => {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID }),
            })
            const result = await res.json()
            setLoading(false)
            if (!res.ok || !result.success) {
              setError(result.error || t('Payment failed', '支付失败'))
              return
            }
            onSuccess(result.creditsAdded, result.credits)
          }}
          onError={(err) => {
            setLoading(false)
            setError(t('Payment error, please try again', '支付出错，请重试'))
            console.error('[PayPal]', err)
          }}
          onCancel={() => {
            setLoading(false)
          }}
        />
        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, margin: '6px 0 0', textAlign: 'center' }}>
            ⚠️ {error}
          </p>
        )}
      </div>
    </PayPalScriptProvider>
  )
}
