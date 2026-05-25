import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:    '#0D2240',
        red:     '#B52020',
        green:   '#1A6A3A',
        gold:    '#8A6200',
        // Layer colors
        L0: '#8B1A1A',
        L1: '#A02020',
        L2: '#B83030',
        L3: '#C55030',
        L4: '#C87020',
        L5: '#4A8A60',
        L6: '#2A6A9A',
        L7: '#3A5AAA',
      },
      fontFamily: {
        sans:  ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono:  ['Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
