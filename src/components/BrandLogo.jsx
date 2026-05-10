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
    <span className={className} aria-label="めししるべ" {...interactiveProps}>
      <img className="brand-mark" src="/meshishirube-logo.png" alt="" aria-hidden="true" />
      <span className="brand-word" aria-hidden="true">めししるべ</span>
    </span>
  )
}
