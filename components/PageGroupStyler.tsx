'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageGroupStyler() {
  const pathname = usePathname()

  useEffect(() => {
    // Determine page group from current path
    let pageGroup = ''

    if (pathname.includes('/baseline') || pathname.includes('/goal')) {
      pageGroup = 'page-starter'
    } else if (pathname.includes('/cycle') || pathname.includes('/session') || pathname.includes('/report')) {
      pageGroup = 'page-progress'
    } else if (pathname.includes('/parent') || pathname.includes('/admin')) {
      pageGroup = 'page-governance'
    }

    // Update body class
    if (pageGroup) {
      // Remove old page group classes
      document.body.classList.remove('page-starter', 'page-progress', 'page-governance')
      // Add new page group class
      document.body.classList.add(pageGroup)
    }
  }, [pathname])

  return null // This component doesn't render anything
}
