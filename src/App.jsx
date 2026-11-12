
import SimulationPage from './components/SimulationPage'
import { useEffect, useMemo, useRef, useState } from 'react'
import AlertsPage from './components/AlertsPage'
import StationDataStatus from './components/StationDataStatus'
import StationDetail from './components/StationDetail'
import StationMap from './components/StationMap'
import BrandLogo from './components/BrandLogo'
import SidebarIcon from './components/SidebarIcon'
import FigmaUiIcon from './components/FigmaUiIcon'
import busIconUrl from './assets/figma/station-bus.svg'
import {
  getStationList,
  getStationDetail,
  USE_STATION_MOCK,
} from './services/stationApi'
import './App.css'

const menus = [
  { id: 'map', label: '지도' },
  { id: 'alert', label: '이용 급변 알림' },
  { id: 'simulation', label: '만약에 시뮬레이션' },
]

function Sidebar({ activeMenu, onMenuChange, collapsed, onToggle }) {
  const touchStartX = useRef(null)

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event) {
    if (touchStartX.current == null) return
    const endX = event.changedTouches[0]?.clientX
    if (endX == null) return
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (delta < -55 && !collapsed) onToggle(true)
    if (delta > 55 && collapsed) onToggle(false)
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="사이드바"
    >
      <div className="sidebar-logo" title="이음 · 용인 교통 정보">
        <BrandLogo collapsed={collapsed} />
      </div>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        {menus.map(menu => (
          <button
            key={menu.id}
            type="button"
            title={collapsed ? menu.label : undefined}
            aria-label={menu.label}
            aria-current={activeMenu === menu.id ? 'page' : undefined}
            className={`nav-item ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={() => onMenuChange(menu.id)}
          >
            <span className="nav-icon" aria-hidden="true"><SidebarIcon type={menu.id} /></span>
            {!collapsed && <span className="nav-label">{menu.label}</span>}
            {menu.id === 'alert' && <span className="notification-dot" />}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar-handle"
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        aria-expanded={!collapsed}
        onClick={() => onToggle(!collapsed)}
        title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </aside>
  )
}

function Header({ children }) {
  return (
    <header className="header">
      {children ?? null}
    </header>
  )
}

function MapPage({ stations, filteredStations, selectedId, onSelectStation, onCloseStation }) {
  const [selectedStation, setSelectedStation] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [showRiskLegend, setShowRiskLegend] = useState(true)

  useEffect(() => {
    if (selectedId == null) {
      setSelectedStation(null)
      setDetailLoading(false)
      setDetailError('')
      return
    }

    const controller = new AbortController()

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError('')
      setSelectedStation(null)

      try {
        const data = await getStationDetail(
          selectedId,
          { signal: controller.signal }
        )

        if (!controller.signal.aborted) {
          if (data) {
            // 목록의 좌표 정보를 보존
            const listStation = stations.find(
              station =>
                String(station.id) === String(selectedId)
            )

            setSelectedStation({
              ...listStation,
              ...data,
              latitude:
                data.latitude ?? listStation?.latitude,
              longitude:
                data.longitude ?? listStation?.longitude,
            })
          } else {
            setDetailError('정류소를 찾지 못했습니다.')
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setDetailError(err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false)
        }
      }
    }

    loadDetail()

    return () => controller.abort()
  }, [selectedId, stations])

  function closeDetail() {
    onCloseStation()
    setSelectedStation(null)
    setDetailError('')
  }

  function handleSelectStation(station) {
    onSelectStation(station.id)
  }

  return (
    <div className="map-screen">
      <div className="map-page">
      <StationMap
        stations={filteredStations}
        selectedStation={selectedStation}
        onSelect={handleSelectStation}
      />

      {/* Figma: 지도 위에 항상 접근할 수 있는 위험도 범례 */}
      <aside className={`map-risk-guide ${showRiskLegend ? '' : 'is-collapsed'}`} aria-label="위험도 안내">
        {showRiskLegend ? (
          <>
            <div className="map-risk-guide-content">
              <div className="map-risk-levels">
                <strong className="map-risk-heading">위험도 안내</strong>
                <div className="map-risk-level"><span className="map-risk-symbol danger"><img src={busIconUrl} alt="" /></span><b>위험</b><small>노선 변경으로 이용 집중 예상</small></div>
                <div className="map-risk-level"><span className="map-risk-symbol warning"><img src={busIconUrl} alt="" /></span><b>주의</b><small>이용 변화 관찰 필요</small></div>
                <div className="map-risk-level"><span className="map-risk-symbol stable"><img src={busIconUrl} alt="" /></span><b>안정</b><small>노선 이용 영향이 적음</small></div>
              </div>
              <div className="map-risk-explainer">
                <strong className="map-risk-heading">표시 정보</strong>
                <span className="map-risk-bus-icon" aria-hidden="true"><img src={busIconUrl} alt="" /></span>
                <small>버스 정류소 위치</small>
                <small>아래 숫자는 평균 승차 인원</small>
              </div>
            </div>
            <button type="button" className="map-risk-dismiss" onClick={() => setShowRiskLegend(false)} aria-label="위험도 안내 닫기">×</button>
          </>
        ) : (
          <button type="button" className="map-risk-restore" onClick={() => setShowRiskLegend(true)}>위험도 안내 보기</button>
        )}
      </aside>

      {detailLoading && (
        <div
          role="status"
          style={{
            position: 'absolute',
            zIndex: 600,
            top: 60,
            right: 16,
            padding: 16,
            borderRadius: 12,
            background: '#fff',
          }}
        >
          상세정보 불러오는 중...
        </div>
      )}

      {detailError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            zIndex: 600,
            top: 60,
            right: 16,
            padding: 16,
            borderRadius: 12,
            background: '#fff',
          }}
        >
          <p>{detailError}</p>
          <button type="button" onClick={closeDetail}>
            닫기
          </button>
        </div>
      )}

      {selectedStation && (
        <StationDetail
          station={selectedStation}
          onClose={closeDetail}
        />
      )}
      </div>
    </div>
  )
}

function App() {
  const [activeMenu, setActiveMenu] = useState('map')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [riskFilter, setRiskFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const searchAreaRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadStations() {
      setLoading(true)
      setError('')

      try {
        const data = await getStationList({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setStations(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadStations()

    return () => controller.abort()
  }, [reloadKey])

  const filteredStations = useMemo(() => {
    const search = query.trim().toLowerCase()

    return stations.filter(station => {
      const searchable = (
        String(station.name ?? '') +
        ' ' +
        String(station.id ?? '')
      ).toLowerCase()

      const matchesSearch = searchable.includes(search)
      const matchesRisk =
        riskFilter === 'all' ||
        station.risk === riskFilter

      return matchesSearch && matchesRisk
    })
  }, [stations, query, riskFilter])

  useEffect(() => {
    if (!searchOpen) return

    function handleOutsidePointer(event) {
      if (!searchAreaRef.current?.contains(event.target)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [searchOpen])

  function handleSelectStation(station) {
    setSelectedId(station.id)
    setActiveMenu('map')
    setSearchOpen(false)
    searchInputRef.current?.blur()
  }

  function handleMenuChange(nextMenu) {
    setActiveMenu(nextMenu)
    setSearchOpen(false)
  }

  return (
    <div className="app">
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={handleMenuChange}
        collapsed={sidebarCollapsed}
        onToggle={setSidebarCollapsed}
      />
      <main className="main">
        <Header>
          <div className="header-tools">
            <div className="map-search-area header-map-search" ref={searchAreaRef}>
              <label className="map-top-search">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={event => { setQuery(event.target.value); setSearchOpen(true) }}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      setSearchOpen(false)
                      event.currentTarget.blur()
                    }
                  }}
                  aria-expanded={searchOpen}
                  aria-controls="map-station-search-results"
                  aria-haspopup="listbox"
                  placeholder="정류소명 또는 번호"
                  aria-label="정류소명 또는 번호 검색"
                />
                <FigmaUiIcon name="search" className="map-top-search-icon" />
              </label>
              {searchOpen && (
                <section id="map-station-search-results" className="map-search-dropdown" aria-label="정류소 검색 결과">
                  <div className="map-search-dropdown-head">
                    <strong>정류소 검색</strong>
                    <button type="button" onClick={() => setSearchOpen(false)} aria-label="검색 결과 닫기">×</button>
                  </div>
                  <label className="map-risk-filter-label">
                    위험도
                    <select value={riskFilter} onChange={event => setRiskFilter(event.target.value)} aria-label="위험도 필터">
                      <option value="all">전체 위험도</option>
                      <option value="danger">위험</option>
                      <option value="warning">주의</option>
                      <option value="stable">안정</option>
                      <option value="unknown">미분류</option>
                    </select>
                  </label>
                  {!USE_STATION_MOCK && <StationDataStatus />}
                  {loading && <p className="map-search-message">정류소 목록 불러오는 중...</p>}
                  {error && <div role="alert" className="map-search-message"><p>{error}</p><button type="button" onClick={() => setReloadKey(n => n + 1)}>다시 시도</button></div>}
                  {!loading && !error && (
                    <>
                      <p className="map-search-message">검색 결과 {filteredStations.length}곳</p>
                      <div className="map-search-results">
                        {filteredStations.slice(0, 30).map(station => (
                          <button type="button" key={station.id}
                            className={`map-search-option ${String(selectedId) === String(station.id) ? 'is-selected' : ''}`}
                            onClick={() => handleSelectStation(station)}>
                            <strong>{station.name}</strong>
                            <small>{station.riskLabel || '위험도 미확인'}</small>
                          </button>
                        ))}
                        {filteredStations.length === 0 && <p className="map-search-message">검색 결과가 없습니다.</p>}
                        {filteredStations.length > 30 && <p className="map-search-message">검색 결과가 많아 처음 30곳만 표시합니다.</p>}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>
          </div>
        </Header>
        {activeMenu === 'map' ? (
          <MapPage
            stations={stations}
            filteredStations={filteredStations}
            selectedId={selectedId}
            onSelectStation={setSelectedId}
            onCloseStation={() => setSelectedId(null)}
          />
        ) : activeMenu === 'alert' ? (
          <AlertsPage />
        ) : (
          <SimulationPage />
        )}
      </main>
    </div>
  )
}

export default App
