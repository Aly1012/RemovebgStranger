'use client'
import { useCallback, useRef } from 'react'

interface Props {
  onUpload: (file: File) => void
  loading: boolean
}

export default function UploadZone({ onUpload, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    onUpload(file)
  }, [onUpload])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111', margin: '0 0 12px', letterSpacing: -0.5 }}>
          去除照片中的指定人物
        </h1>
        <p style={{ fontSize: 17, color: '#666', margin: 0, lineHeight: 1.6 }}>
          AI 自动识别所有人物 · 点击选择要去除的人 · 背景像素完全保留
        </p>
      </div>

      {/* Upload box */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          width: '100%', maxWidth: 560,
          border: '2px dashed #d0d5dd',
          borderRadius: 20,
          background: '#fff',
          padding: '56px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          cursor: loading ? 'default' : 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          transition: 'border-color 0.2s',
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: 48, height: 48,
              border: '4px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <p style={{ color: '#555', fontWeight: 600, fontSize: 16, margin: 0 }}>正在检测人物，请稍候…</p>
          </>
        ) : (
          <>
            {/* Icon */}
            <div style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }}>
              <svg width="36" height="36" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#222', margin: '0 0 4px' }}>
                拖拽图片到这里
              </p>
              <p style={{ fontSize: 14, color: '#999', margin: 0 }}>支持 JPG、PNG、WebP</p>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                letterSpacing: 0.2,
              }}
            >
              选择图片
            </button>
          </>
        )}
      </div>

      {/* Trust badges */}
      <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { icon: '🔒', text: '图片不上传服务器' },
          { icon: '⚡', text: '本地 AI 处理' },
          { icon: '🗑️', text: '处理后立即销毁' },
          { icon: '✅', text: '背景像素零修改' },
        ].map(b => (
          <div key={b.text} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 100,
            fontSize: 13,
            color: '#444',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <span>{b.icon}</span>
            <span>{b.text}</span>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
