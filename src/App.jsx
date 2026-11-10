
import AlertsPage from './components/AlertsPage'
import StationDataStatus from './components/StationDataStatus'
import { useState } from 'react'
import './App.css'

const menus = [
  { id: 'map', label: '지도', icon: '⌖' },
  { id: 'alert', label: '이용 급변 알림', icon: '♧' },
  { id: 'simulation', label: '만약에 시뮬레이션', icon: '➜' },
]

const riskLevels = [
  {
    id: 'high',
    label: '위험',
    detail: '노선 부족, 긴 배차간격, 낮은 연결성',
  },
  {
    id: 'medium',
    label: '주의',
    detail: '일부 노선 불균형 또는 연결성 미흡',
  },
  {
    id: 'low',
    label: '양호',
    detail: '노선과 연결성이 양호',
  },
]

function Sidebar({ activeMenu, onMenuChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-symbol">이음</span>
        <span className="logo-caption">용인 교통 정보</span>
      </div>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        {menus.map((menu) => (
          <button
            key={menu.id}
            type="button"
            className={`nav-item ${
              activeMenu === menu.id ? 'active' : ''
            }`}
            onClick={() => onMenuChange(menu.id)}
          >
            <span className="nav-icon" aria-hidden="true">
              {menu.icon}
            </span>
            <span>{menu.label}</span>
            {menu.id === 'alert' && (
              <span className="notification-dot" />
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function Header() {
  return (
    <header className="header">
      <div>
        <strong>용인시 교통 서비스</strong>
        <span className="header-subtitle">
          시민을 위한 교통 정보
        </span>
      </div>
      <span className="header-status">개발 중</span>
    </header>
  )
}

function RiskLegend() {
  return (
    <section className="risk-legend" aria-label="위험도 안내">
      <div className="legend-column">
        <h2>위험도 안내</h2>
        {riskLevels.map((risk) => (
          <div className="legend-item" key={risk.id}>
            <span className={`risk-indicator ${risk.id}`} />
            <div>
              <strong>{risk.label}</strong>
              <p>{risk.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="legend-column legend-info">
        <h2>표시 정보</h2>
        <p>정류소별 교통 정보 표시 영역</p>
        <p className="muted">
          API 연결 후 실제 데이터를 표시합니다.
        </p>
      </div>
    </section>
  )
}

function MapPage() {
  return (
    <div className="map-page">
      <div className="map-placeholder">
        <div className="map-notice">
          정류소를 선택하면 상세 정보를 확인할 수 있어요.
        </div>
        <div className="map-empty">
          <span className="map-empty-icon">⌖</span>
          <h1>지도 연동 준비 중</h1>
          <p>
            지도 서비스 및 정류소 API 연결 후
            실제 지도를 표시합니다.
          </p>

           <StationDataStatus />
        </div>
        <RiskLegend />
      </div>
    </div>
  )
}

function App() {
  const [activeMenu, setActiveMenu] = useState('map')
  const currentMenu = menus.find(
    (menu) => menu.id === activeMenu
  )

  return (
    <div className="app">
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
      />
      <main className="main">
        <Header />

{activeMenu === 'map' ? (
  <MapPage />
) : activeMenu === 'alert' ? (
  <AlertsPage />
) : (
  <section className="coming-soon">
    <h1>{currentMenu?.label}</h1>
    <p>이 화면은 다음 단계에서 구현합니다.</p>
  </section>
)}

      </main>
    </div>
  )
}

export default App
