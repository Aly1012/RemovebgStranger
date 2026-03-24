'use client'
import { useState, useCallback } from 'react'
import UploadZone from '@/components/UploadZone'
import ImageEditor from '@/components/ImageEditor'
import ResultPanel from '@/components/ResultPanel'

export type Person = {
  id: number
  mask: number[][]   // 二维 0/1 掩码，与原图同宽高
  bbox: [number, number, number, number]  // x1,y1,x2,y2 (归一化 0-1)
  selected: boolean
}

export type Stage = 'upload' | 'select' | 'result'

export default function Home() {
  const [stage, setStage] = useState<Stage>('upload')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [persons, setPersons] = useState<Person[]>([])
  const [resultUrl, setResultUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleUpload = useCallback(async (file: File) => {
    setError('')
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImageUrl(url)

    // 获取图片尺寸
    const img = new Image()
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url

    // 调用检测API
    setLoading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/detect', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const detected: Person[] = (data.persons as Omit<Person, 'selected'>[]).map(p => ({
        ...p,
        selected: false,
      }))
      setPersons(detected)
      setStage('select')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '检测失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  const togglePerson = (id: number) => {
    setPersons(ps => ps.map(p => p.id === id ? { ...p, selected: !p.selected } : p))
  }

  const handleRemove = async () => {
    const selected = persons.filter(p => p.selected)
    if (!selected.length) { setError('请先选择要去除的人物'); return }
    setError('')
    setLoading(true)
    try {
      const form = new FormData()
      form.append('image', imageFile!)
      form.append('ids', JSON.stringify(selected.map(p => p.id)))
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
    setPersons([])
    setResultUrl('')
    setError('')
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-900">RemovebgStranger</span>
        <span className="text-sm text-gray-400 ml-1">智能人物去除</span>
      </header>

      {/* Steps */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm">
          {(['upload', 'select', 'result'] as Stage[]).map((s, i) => {
            const labels = ['① 上传图片', '② 选择人物', '③ 下载结果']
            const active = stage === s
            const done = ['upload', 'select', 'result'].indexOf(stage) > i
            return (
              <span key={s} className={`px-3 py-1 rounded-full font-medium transition-colors
                ${active ? 'bg-blue-600 text-white' : done ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {stage === 'upload' && (
          <UploadZone onUpload={handleUpload} loading={loading} />
        )}

        {stage === 'select' && (
          <ImageEditor
            imageUrl={imageUrl}
            imageSize={imageSize}
            persons={persons}
            onToggle={togglePerson}
            onRemove={handleRemove}
            onBack={handleReset}
            loading={loading}
          />
        )}

        {stage === 'result' && (
          <ResultPanel
            originalUrl={imageUrl}
            resultUrl={resultUrl}
            onReset={handleReset}
          />
        )}
      </div>

      <footer className="text-center py-4 text-xs text-gray-400">
        图片仅在本次会话中使用，不存储于任何服务器
      </footer>
    </main>
  )
}
