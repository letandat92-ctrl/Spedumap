// components/LogoSVG.tsx
export function LogoSVG({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Chameleon Head */}
      <circle cx="55" cy="40" r="18" fill="#2D5016" />
      
      {/* Chameleon Eye */}
      <circle cx="65" cy="35" r="6" fill="white" />
      <circle cx="65" cy="35" r="3" fill="black" />
      
      {/* Chameleon Mouth */}
      <path
        d="M 50 45 Q 55 48 60 45"
        stroke="#0D2240"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Tail Curve */}
      <path
        d="M 40 42 Q 30 40 25 35 Q 20 30 22 20"
        stroke="#2D5016"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Branch */}
      <rect x="20" y="45" width="45" height="5" rx="2" fill="#6B4423" />
      
      {/* Accent Lines (diversity) */}
      <circle cx="55" cy="28" r="1.5" fill="#1A6A7A" opacity="0.6" />
      <circle cx="48" cy="32" r="1.5" fill="#2D7A4A" opacity="0.6" />
      <circle cx="52" cy="50" r="1.5" fill="#C94545" opacity="0.6" />
    </svg>
  )
}
