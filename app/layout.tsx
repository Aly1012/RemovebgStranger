import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RemovebgStranger — 智能人物去除',
  description: '上传照片，选择要去除的人物，保留真实背景',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ background: '#f7f8fa', minHeight: '100vh', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
