// components/DocumentHeader.tsx
import type { ReactNode } from 'react'
import { LogoSVG } from '@/components/LogoSVG'

interface DocumentHeaderProps {
  title:     string
  subtitle?: string
  /** Right-aligned content, e.g. a date field. */
  right?:    ReactNode
}

/**
 * Navy document header matching the ui_*.html templates:
 * logo + title + subtitle on the left, optional content (date field) on the right.
 */
export function DocumentHeader({ title, subtitle, right }: DocumentHeaderProps) {
  return (
    <div className="doc-header">
      <div className="doc-header-left">
        <LogoSVG size={28} />
        <div>
          <h1>{title}</h1>
          {subtitle && <div className="doc-sub">{subtitle}</div>}
        </div>
      </div>
      {right && <div className="doc-header-right">{right}</div>}
    </div>
  )
}
