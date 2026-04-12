import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'RemovebgStranger — Remove People from Photos',
  description: 'Paint over people to remove them from photos. AI fills the background automatically.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-CG41T77GDB"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CG41T77GDB');
          `}
        </Script>
      </head>
      <body style={{ background: '#f7f8fa', minHeight: '100vh', margin: 0 }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
