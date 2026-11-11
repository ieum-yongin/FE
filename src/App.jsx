
import { useMemo, useState } from 'react'
import AlertsPage from './components/AlertsPage'
import StationDataStatus from './components/StationDataStatus'
import StationDetail from './components/StationDetail'
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

// 모든 수치와 지도 위치는 화면 테스트용 가상 데이터입니다.
// 실제 정류소 번호, 이용량, 위험도, 통계가 아닙니다.
const demoStations = [
  {
    id: 'demo-1',
    name: '죽전역 (마을)',
    direction: '한신 길훈아파트 방면',
    risk: 'stable',
    riskLabel: '안정',
    averageBoarding: 270,
    averageAlighting: 190,
    routeCount: 8,
    transferRate: 69,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 A', '시연 노선 B'],
    x: 28,
    y: 31,
  },
  {
    id: 'demo-2',
    name: '기흥역',
    direction: '시연용 방면 정보',
    risk: 'warning',
    riskLabel: '주의',
    averageBoarding: 185,
    averageAlighting: 160,
    routeCount: 5,
    transferRate: 48,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 C'],
    x: 49,
    y: 47,
  },
  {
    id: 'demo-3',
    name: '용인시청·용인대역',
    direction: '시연용 방면 정보',
    risk: 'danger',
    riskLabel: '위험',
    averageBoarding: 120,
    averageAlighting: 95,
    routeCount: 2,
    transferRate: 24,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 D'],
    x: 66,
    y: 58,
  },
  {
    id: 'demo-4',
    name: '수지구청역',
    direction: '시연용 방면 정보',
    risk: 'stable',
    riskLabel: '안정',
    averageBoarding: 320,
    averageAlighting: 290,
    routeCount: 9,
    transferRate: 72,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 E', '시연 노선 F'],
    x: 29,
    y: 68,
  },
  {
    id: 'demo-5',
    name: '강남대역',
    direction: '시연용 방면 정보',
    risk: 'warning',
    riskLabel: '주의',
    averageBoarding: 210,
    averageAlighting: 175,
    routeCount: 4,
    transferRate: 41,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 G'],
    x: 73,
    y: 25,
  },
]

const markerColors = {
  stable: '#40e85b',
  warning: '#ffdf46',
  danger: '#ff6868',
}

function Sidebar({ activeMenu, onMenuChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-symbol">이음</span>
        <span className="logo-caption">
          용인 교통 정보
        </span>
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

      <span className="header-status">
        개발 중
      </span>
    </header>
  )
}

function RiskLegend() {
  return (
    <section
      className="risk-legend"
      aria-label="위험도 안내"
    >
      <div className="legend-column">
        <h2>위험도 안내</h2>

        {riskLevels.map((risk) => (
          <div className="legend-item" key={risk.id}>
            <span
              className={`risk-indicator ${risk.id}`}
            />

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
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')

  const filteredStations = useMemo(() => {
    return demoStations.filter((station) => {
      const matchesName = (
        station.name + ' ' + station.id
      )
        .toLowerCase()
        .includes(query.trim().toLowerCase())

      const matchesRisk =
        riskFilter === 'all' ||
        station.risk === riskFilter

      return matchesName && matchesRisk
    })
  }, [query, riskFilter])

  const selectedStation =
    demoStations.find(
      (station) => station.id === selectedId
    ) ?? null

  return (
    <div
      className="map-page"
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 95px)',
      }}
    >
      <div className="map-placeholder">
        <div className="map-notice">
          정류소 마커를 선택하면 상세 정보를
          확인할 수 있어요.
        </div>

        <div className="map-empty">
          <span className="map-empty-icon">
            ⌖
          </span>

          <h1>정류소 지도 시연</h1>

          <p>
            실제 지도 SDK 연결 전,
            정류소 선택 기능을 테스트합니다.
          </p>

          <StationDataStatus />

          {/* 정류소 검색 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
              width: 'min(650px, 100%)',
              margin: '22px auto 14px',
            }}
          >
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="정류소명 검색"
              aria-label="정류소 검색"
              style={{
                flex: '1 1 220px',
                minWidth: 0,
                padding: '12px 15px',
                border: '1px solid #ccc',
                borderRadius: 10,
                fontSize: 14,
                background: '#fff',
                color: '#232323',
              }}
            />

            <select
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value)
              }
              aria-label="위험도 선택"
              style={{
                padding: '12px 15px',
                border: '1px solid #ccc',
                borderRadius: 10,
                background: '#fff',
                color: '#232323',
                fontSize: 14,
              }}
            >
              <option value="all">전체 위험도</option>
              <option value="danger">위험</option>
              <option value="warning">주의</option>
              <option value="stable">안정</option>
            </select>
          </div>

          {/* 실제 지도가 아닌 마커 배치 테스트 영역 */}
          <div
            role="group"
            aria-label="시연용 정류소 마커"
            style={{
              position: 'relative',
              width: 'min(650px, 100%)',
              height: 310,
              margin: '0 auto 18px',
              overflow: 'hidden',
              border: '1px solid #ceddce',
              borderRadius: 18,
              backgroundColor: '#edf4e9',
              backgroundImage: [
                'linear-gradient(33deg, transparent 46%, #fff 46%, #fff 49%, transparent 49%)',
                'linear-gradient(116deg, transparent 61%, #fff 61%, #fff 64%, transparent 64%)',
                'linear-gradient(0deg, transparent 71%, #fff 71%, #fff 74%, transparent 74%)',
              ].join(','),
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 14,
                color: '#687768',
                fontSize: 12,
              }}
            >
              용인시 · 시연용 배치
            </span>

            {filteredStations.map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() =>
                  setSelectedId(station.id)
                }
                title={`${station.name} 상세정보 보기`}
                aria-label={`${station.name} 선택`}
                aria-pressed={
                  selectedId === station.id
                }
                style={{
                  position: 'absolute',
                  left: `${station.x}%`,
                  top: `${station.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  minWidth: 100,
                  padding: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  zIndex:
                    selectedId === station.id ? 2 : 1,
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 39,
                    height: 39,
                    border: '3px solid white',
                    borderRadius: 12,
                    background:
                      markerColors[station.risk],
                    boxShadow:
                      selectedId === station.id
                        ? '0 0 0 3px #333'
                        : '0 2px 7px #0003',
                    color: '#222',
                    fontWeight: 800,
                    fontSize: 19,
                  }}
                >
                  ⌖
                </span>

                <span
                  style={{
                    padding: '5px 8px',
                    maxWidth: 130,
                    borderRadius: 7,
                    background: '#fff',
                    boxShadow: '0 2px 6px #0002',
                    color: '#222',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {station.name}
                </span>
              </button>
            ))}

            {filteredStations.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#666',
                  fontSize: 14,
                }}
              >
                검색 결과가 없습니다.
              </div>
            )}
          </div>

          <p
            style={{
              fontSize: 12,
              color: '#777',
              marginBottom: 20,
            }}
          >
            표시된 위치와 통계는 모두 시연용입니다.
          </p>
        </div>

        <RiskLegend />
      </div>

      {selectedStation && (
        <StationDetail
          station={selectedStation}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function App() {
  const [activeMenu, setActiveMenu] =
    useState('map')

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
            <p>
              이 화면은 다음 단계에서 구현합니다.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
