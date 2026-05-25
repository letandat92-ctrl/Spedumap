import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    domains: ['sfwmcdezjlkedyjjgkng.supabase.co'],
  },
}

export default nextConfig
