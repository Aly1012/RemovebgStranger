'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/LangContext'

interface Props {
  imageUrl: string
  onRemove: (maskDataUrl: string) => void
  onBack: () => void
  loading: boolean
}

export default function ImageEditor({ imageUrl, onRemove, onBack, loading }: Props) {
  const { t } = useLang()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(40)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas) return
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      const maxW = canvas.parentElement?.clientWidth ?? 800
      const scale = Math.min(1, maxW / img.naturalWidth)
      const W = img.naturalWidth * scale
      const H = img.naturalHeight * scale
      canvas.width = W
      canvas.height = H
      maskCanvas.width = W
      maskCanvas.height = H
      ctx.drawImage(img, 0, 0, W, H)
      const mCtx = maskCanvas.getContext('2d')!
      mCtx.clearRect(0, 0, W, H)
      setHasStrokes(false)
    }
    img.src = imageUrl
  }, [imageUrl])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const paint = (x: number, y: number) => {
    const canvas = canvasRef.current!
    const maskCanvas = maskCanvasRef.current!
    const ctx = canvas.getContext('2d')!
    const mCtx = maskCanvas.getContext('2d')!

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()

    mCtx.globalCompositeOperation = 'source-over'
    mCtx.fillStyle = '#ffffff'
    mCtx.beginPath()
    mCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    mCtx.fill()

    setHasStrokes(true)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    paint(getPos(e).x, getPos(e).y)
  }
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    paint(getPos(e).x, getPos(e).y)
  }
  const handleMouseUp = () => setIsDrawing(false)

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    paint(getPos(e).x, getPos(e).y)
  }
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    paint(getPos(e).x, getPos(e).y)
  }

  const clearMask = () => {
    const canvas = canvasRef.current!
    const maskCanvas = maskCanvasRef.current!
    const ctx = canvas.getContext('2d')!
    const mCtx = maskCanvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = imageUrl
    mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    setHasStrokes(false)
  }

  const handleSubmit = () => {
    const maskCanvas = maskCanvasRef.current!
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = maskCanvas.width
    exportCanvas.height = maskCanvas.height
    const eCtx = exportCanvas.getContext('2d')!
    eCtx.fillStyle = '#000000'
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    eCtx.drawImage(maskCanvas, 0, 0)
    onRemove(exportCanvas.toDataURL('image/png'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 0' }}>

      {/* 提示栏 */}
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
          background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
        }}>
          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 3px' }}>{t('paintTitle')}</p>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{t('paintSubtitle')}</p>
        </div>
      </div>

      {/* 画笔大小 */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>{t('brushSize')}</span>
        <input
          type="range"
          min={10}
          max={120}
          value={brushSize}
          onChange={e => setBrushSize(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#2563eb' }}
        />
        <div style={{
          width: brushSize > 60 ? 60 : brushSize,
          height: brushSize > 60 ? 60 : brushSize,
          minWidth: 10,
          minHeight: 10,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.5)',
          border: '2px solid #ef4444',
          flexShrink: 0,
          transition: 'all 0.1s',
        }} />
        <span style={{ fontSize: 13, color: '#aaa', minWidth: 30 }}>{brushSize}px</span>
        {hasStrokes && (
          <button
            onClick={clearMask}
            style={{
              padding: '7px 16px',
              borderRadius: 10,
              border: '1.5px solid #fecaca',
              background: '#fff',
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('clearRedraw')}
          </button>
        )}
      </div>

      {/* Canvas */}
      <div style={{
        background: '#f8fafc',
        borderRadius: 20,
        border: '1px solid #e5e7eb',
        padding: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDrawing(false)}
          style={{
            width: '100%',
            borderRadius: 12,
            display: 'block',
            cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='rgba(239,68,68,0.4)' stroke='%23ef4444' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`,
            touchAction: 'none',
          }}
        />
        <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 8 }}>
        <button
          onClick={onBack}
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
          {t('backUpload')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !hasStrokes}
          style={{
            padding: '11px 28px',
            borderRadius: 12,
            border: 'none',
            background: loading || !hasStrokes
              ? '#e5e7eb'
              : 'linear-gradient(135deg, #2563eb, #4f46e5)',
            color: loading || !hasStrokes ? '#aaa' : '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading || !hasStrokes ? 'not-allowed' : 'pointer',
            boxShadow: loading || !hasStrokes ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loading && (
            <span style={{
              width: 16, height: 16,
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {loading ? t('processing') : t('removeArea')}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
