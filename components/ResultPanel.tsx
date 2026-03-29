'use client'

interface Props {
  originalUrl: string
  resultUrl: string
  onReset: () => void
}

export default function ResultPanel({ originalUrl, resultUrl, onReset }: Props) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = 'removed_person.png'
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 0' }}>

      {/* Success banner */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          width: 40, height: 40,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
        }}>
          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 3px' }}>处理完成！</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>人物已去除，背景像素完全保留</p>
        </div>
      </div>

      {/* Comparison: side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Original */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>原图</p>
          </div>
          <div style={{ padding: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalUrl} alt="原图" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 360, display: 'block' }} />
          </div>
        </div>

        {/* Result: show inpainted image directly */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#aaa', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>处理结果</p>
          </div>
          <div style={{ padding: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="处理结果"
              style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 360, display: 'block' }}
            />
          </div>
        </div>
      </div>

      {/* Tip */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13,
        color: '#3b82f6',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>💡</span>
        <span>AI 智能修复背景，人物区域由周围场景像素填充，下载即用</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={onReset}
          style={{
            padding: '11px 22px',
            borderRadius: 12,
            border: '1.5px solid #e5e7eb',
            background: '#fff',
            color: '#555',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          处理新图片
        </button>
        <button
          onClick={handleDownload}
          style={{
            padding: '11px 28px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: 0.2,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载 PNG
        </button>
      </div>
    </div>
  )
}
