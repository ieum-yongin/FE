import logo from '../assets/figma/ieum-logo.png'

export default function BrandLogo({ collapsed = false }) {
  return (
    <div className={`brand-logo ${collapsed ? 'brand-logo--compact' : ''}`} aria-label="이음 · 용인 교통 정보">
      <img className="brand-logo__image" src={logo} alt="이음 로고" />
      {!collapsed && <span className="brand-logo__caption">용인 교통 정보</span>}
    </div>
  )
}
