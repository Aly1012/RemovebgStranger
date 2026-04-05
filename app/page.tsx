'use client'
import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import UploadZone from '@/components/UploadZone'
import ImageEditor from '@/components/ImageEditor'
import ResultPanel from '@/components/ResultPanel'
import UserMenu from '@/components/UserMenu'
import UpgradeModal from '@/components/UpgradeModal'
import { useLang } from '@/lib/LangContext'
import { useUsage } from '@/lib/useUsage'

export type Stage = 'upload' | 'paint' | 'result'

const S = {
  header: {
    background: '#fff',
    borderBottom: '1px solid #eaecf0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '0 24px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 34, height: 34,
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 17, fontWeight: 700, color: '#111', letterSpacing: -0.3 },
  steps: { display: 'flex', alignItems: 'center', gap: 4 },
  content: { maxWidth: 960, margin: '0 auto', padding: '0 24px' },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 14,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '24px',
    fontSize: 12,
    color: '#aaa',
    borderTop: '1px solid #f0f0f0',
    marginTop: 40,
  },
}

export default function Home() {
  const { locale, setLocale, t } = useLang()
  const { data: session } = useSession()
  const { usage, refresh: refreshUsage, updateFromHeaders } = useUsage()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'quota' | 'upgrade'>('upgrade')
  const [stage, setStage] = useState<Stage>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [resultUrl, setResultUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleUpload = useCallback((file: File) => {
    setError('')
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setStage('paint')
  }, [])

  const handleRemove = async (maskDataUrl: string) => {
    if (!imageFile) return
    setError('')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('image', imageFile)
      form.append('mask', maskDataUrl)
      const res = await fetch('/api/remove', { method: 'POST', body: form })
      if (res.status === 429) {
        setUpgradeReason('quota')
        setShowUpgrade(true)
        return
      }
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      setResultUrl(URL.createObjectURL(blob))
      setStage('result')
      // 优先从响应头更新用量（省去额外 /api/usage 请求）
      updateFromHeaders(res.headers)
      refreshUsage()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('processFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStage('upload')
    setImageFile(null)
    setImageUrl('')
    setResultUrl('')
    setError('')
  }

  const handleRefine = useCallback(async () => {
    // 把当前结果图作为新的输入图，回到涂抹阶段
    try {
      const res = await fetch(resultUrl)
      const blob = await res.blob()
      const file = new File([blob], 'refined.png', { type: 'image/png' })
      setError('')
      setImageFile(file)
      setImageUrl(resultUrl)
      setResultUrl('')
      setStage('paint')
    } catch {
      setError(t('processFailed'))
    }
  }, [resultUrl, t])

  const steps = [
    { key: 'upload', label: t('step1') },
    { key: 'paint',  label: t('step2') },
    { key: 'result', label: t('step3') },
  ] as const
  const stageIdx = steps.findIndex(s => s.key === stage)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={S.header}>
        <div style={S.headerInner}>
          {/* Logo */}
          <div style={S.logo}>
            <div style={S.logoIcon}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span style={S.logoText}>{t('appName')}</span>
          </div>

          {/* Steps */}
          <div style={S.steps}>
            {steps.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  padding: '5px 14px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  background: i === stageIdx ? '#2563eb' : i < stageIdx ? '#dbeafe' : 'transparent',
                  color: i === stageIdx ? '#fff' : i < stageIdx ? '#2563eb' : '#aaa',
                }}>
                  {i < stageIdx ? '✓ ' : `${i + 1}. `}{s.label}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 20, height: 1, background: i < stageIdx ? '#93c5fd' : '#e5e7eb', margin: '0 2px' }} />
                )}
              </div>
            ))}
          </div>

          {/* Language switcher + Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(['en', 'zh'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: locale === l ? '1.5px solid #2563eb' : '1.5px solid #e5e7eb',
                  background: locale === l ? '#eff6ff' : '#fff',
                  color: locale === l ? '#2563eb' : '#888',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {l === 'zh' ? '中文' : 'EN'}
              </button>
            ))}

            <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />

            <UserMenu
              locale={locale}
              onUpgrade={() => { setUpgradeReason('upgrade'); setShowUpgrade(true) }}
            />
          </div>
        </div>
      </header>

      <div style={{ flex: 1 }}>
        <div style={S.content}>
          {error && (
            <div style={S.error}>
              <span>⚠️</span> {error}
            </div>
          )}
          {stage === 'upload' && <UploadZone onUpload={handleUpload} loading={loading} />}
          {stage === 'paint' && (
            <ImageEditor
              imageUrl={imageUrl}
              onRemove={handleRemove}
              onBack={handleReset}
              loading={loading}
            />
          )}
          {stage === 'result' && (
            <ResultPanel originalUrl={imageUrl} resultUrl={resultUrl} onReset={handleReset} onRefine={handleRefine} />
          )}
        </div>
      </div>

      <footer style={S.footer}>
        {t('footerText')}
      </footer>

      {showUpgrade && (
        <UpgradeModal
          locale={locale}
          reason={upgradeReason}
          plan={usage?.plan ?? 'guest'}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  )
}
