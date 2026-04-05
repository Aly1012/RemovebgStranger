import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'RemovebgStranger — Remove People from Photos',
  description: 'Paint over people to remove them from photos. AI fills the background automatically.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#f7f8fa', minHeight: '100vh', margin: 0 }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
