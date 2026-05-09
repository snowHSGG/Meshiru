import '../styles/BrandLogo.css'

export default function BrandLogo({ size = 'header', onClick }) {
  const className = `brand-logo brand-logo-${size}${onClick ? ' brand-logo-clickable' : ''}`
  const interactiveProps = onClick
    ? {
        onClick,
        role: 'button',
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        },
      }
    : {}

  return (
    <span className={className} aria-label="meshishirube" {...interactiveProps}>
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-origin" />
        <span className="brand-mark-dot" />
        <span className="brand-mark-dot" />
        <span className="brand-mark-dot" />
      </span>
      <span className="brand-word">
        <span className="brand-word-meshi">meshi</span>
        <span className="brand-word-shirube">shirube</span>
      </span>
    </span>
  )
}
