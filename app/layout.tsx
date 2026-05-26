import type { Metadata } from 'next'
import './globals.css'
import { PageGroupStyler } from '@/components/PageGroupStyler'

export const metadata: Metadata = {
  title: 'SPEDUMAP',
  description: 'Hệ thống đánh giá phát triển toàn diện',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-white text-neutral-900">
        <PageGroupStyler />
        {children}
      </body>
    </html>
  )
}
