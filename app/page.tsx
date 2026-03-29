'use client'
import { useState, useCallback } from 'react'
import UploadZone from '@/components/UploadZone'
import ImageEditor from '@/components/ImageEditor'
import ResultPanel from '@/components/ResultPanel'

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
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      setResultUrl(URL.createObjectURL(blob))
      setStage('result')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '处理失败，请重试')
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

  const steps = [
    { key: 'upload', label: '上传图片' },
    { key: 'paint',  label: '涂抹人物' },
    { key: 'result', label: '下载结果' },
  ] as const
  const stageIdx = steps.findIndex(s => s.key === stage)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <div style={S.logoIcon}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span style={S.logoText}>RemovebgStranger</span>
          </div>

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
            <ResultPanel originalUrl={imageUrl} resultUrl={resultUrl} onReset={handleReset} />
          )}
        </div>
      </div>

      <footer style={S.footer}>
        🔒 图片仅在本次会话中处理，不存储于任何服务器 · RemovebgStranger
      </footer>
    </div>
  )
}
