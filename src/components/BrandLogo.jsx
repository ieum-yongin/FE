import logo from '../assets/figma/ieum-logo.png'

export default function BrandLogo({ collapsed = false }) {
  return (
    <div className={`brand-logo ${collapsed ? 'brand-logo--compact' : ''}`} aria-label="이음">
      <img className="brand-logo__image" src={logo} alt="이음 로고" />
    </div>
  )
}
