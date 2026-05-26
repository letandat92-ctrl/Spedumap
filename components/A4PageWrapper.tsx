// components/A4PageWrapper.tsx
import type { ReactNode } from 'react'

/**
 * A4 document container (210mm × 297mm) matching the ui_*.html templates.
 * Use as the outer wrapper for printable report pages.
 */
export function A4PageWrapper({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>
}
