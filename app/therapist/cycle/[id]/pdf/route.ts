export const runtime = 'nodejs'

import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { getCyclePdfData } from '@/app/therapist/actions/pdf-data'
import { CyclePdfDocument } from '@/components/pdf/CyclePdfDocument'
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return new Response('Missing cycle id', { status: 400 })

  try {
    const data = await getCyclePdfData(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(CyclePdfDocument, { data }) as any)
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': (() => {
          const raw = data.childName || 'report'
          const ascii = raw.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7E]/g, '_')
          return `inline; filename="spedumap-${ascii}.pdf"; filename*=UTF-8''${encodeURIComponent(`spedumap-${raw}.pdf`)}`
        })(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PDF generation failed'
    return new Response(msg, { status: 500 })
  }
}
