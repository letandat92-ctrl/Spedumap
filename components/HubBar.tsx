'use client'

// HubBar — thin nav strip for pages that lack a logo header.
// Renders a "← Hub" link back to / using brand navy.
// Usage: <HubBar /> at the top of the page return.

export function HubBar() {
  return (
    <div style={{
      height: 40, background: 'var(--navy)',
      display: 'flex', alignItems: 'center', padding: '0 20px',
      borderBottom: '1px solid rgba(255,255,255,.1)',
    }}>
      <a
        href="/"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 600,
          color: 'rgba(255,255,255,.75)', textDecoration: 'none',
          letterSpacing: '.02em', transition: 'color .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
      >
        ← Hub
      </a>
    </div>
  )
}
