// hooks/usePageGroup.ts
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function usePageGroup() {
  const pathname = usePathname()

  useEffect(() => {
    // Determine page group based on current path
    let pageGroup = ''

    if (pathname.includes('baseline') || pathname.includes('goal')) {
      pageGroup = 'page-starter'
    } else if (pathname.includes('cycle') || pathname.includes('session') || pathname.includes('report')) {
      pageGroup = 'page-progress'
    } else if (pathname.includes('parent') || pathname.includes('admin')) {
      pageGroup = 'page-governance'
    }

    // Update body class
    if (pageGroup) {
      document.body.className = document.body.className
        .replace(/page-(starter|progress|governance)/g, '')
        .trim() + ` ${pageGroup}`
    }

    return () => {
      // Cleanup on unmount
      document.body.className = document.body.className
        .replace(/page-(starter|progress|governance)/g, '')
        .trim()
    }
  }, [pathname])
}
