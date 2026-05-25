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
      <body className="font-sans antialiased bg-white text-neutral-900">
        <PageGroupStyler />
        {children}
      </body>
    </html>
  )
}
