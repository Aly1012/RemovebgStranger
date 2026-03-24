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
    a.download = 'removed_bg.png'
    a.click()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-3">原图</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={originalUrl} alt="原图" className="w-full rounded-lg object-contain max-h-96" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500 mb-3">处理结果</p>
          {/* 棋盘格背景表示透明 */}
          <div className="rounded-lg overflow-hidden max-h-96"
            style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 20px 20px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="处理结果" className="w-full object-contain max-h-96" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onReset}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          处理新图片
        </button>
        <button
          onClick={handleDownload}
          className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载 PNG
        </button>
      </div>
    </div>
  )
}
