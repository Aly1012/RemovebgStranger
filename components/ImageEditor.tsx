'use client'
import { useEffect, useRef, useState } from 'react'
import type { Person } from '@/app/page'

interface Props {
  imageUrl: string
  imageSize: { w: number; h: number }
  persons: Person[]
  onToggle: (id: number) => void
  onRemove: () => void
  onBack: () => void
  loading: boolean
}

export default function ImageEditor({ imageUrl, imageSize, persons, onToggle, onRemove, onBack, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)

  // 加载图片
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgEl(img)
    img.src = imageUrl
  }, [imageUrl])

  // 绘制 canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgEl) return
    const ctx = canvas.getContext('2d')!

    const maxW = canvas.parentElement?.clientWidth ?? 700
    const scale = Math.min(1, maxW / imgEl.naturalWidth)
    canvas.width = imgEl.naturalWidth * scale
    canvas.height = imgEl.naturalHeight * scale

    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height)

    // 绘制每个人物的 bbox 和高亮
    persons.forEach(p => {
      const [x1n, y1n, x2n, y2n] = p.bbox
      const x1 = x1n * canvas.width
      const y1 = y1n * canvas.height
      const x2 = x2n * canvas.width
      const y2 = y2n * canvas.height

      if (p.selected) {
        ctx.fillStyle = 'rgba(239,68,68,0.35)'
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
      } else {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
      }
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      // 标签
      ctx.fillStyle = p.selected ? '#ef4444' : '#3b82f6'
      ctx.fillRect(x1, y1 - 22, 60, 22)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(`人物 ${p.id + 1}`, x1 + 6, y1 - 6)
    })
  }, [imgEl, persons])

  // 点击 canvas 选人
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width
    const cy = (e.clientY - rect.top) / rect.height

    // 找最小面积包含点击点的 bbox
    let hit: Person | null = null
    let minArea = Infinity
    persons.forEach(p => {
      const [x1, y1, x2, y2] = p.bbox
      if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
        const area = (x2 - x1) * (y2 - y1)
        if (area < minArea) { minArea = area; hit = p }
      }
    })
    if (hit) onToggle((hit as Person).id)
  }

  const selectedCount = persons.filter(p => p.selected).length

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm text-gray-500 mb-3">
          点击图中人物框选择要去除的人物（蓝框=未选，红框=已选）
        </p>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full rounded-lg cursor-crosshair"
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* 人物列表 */}
      {persons.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">检测到 {persons.length} 个人物</p>
          <div className="flex flex-wrap gap-2">
            {persons.map(p => (
              <button
                key={p.id}
                onClick={() => onToggle(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                  ${p.selected
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}
              >
                人物 {p.id + 1} {p.selected ? '✓' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          重新上传
        </button>
        <button
          onClick={onRemove}
          disabled={loading || selectedCount === 0}
          className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          去除选中人物 {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      </div>
    </div>
  )
}
