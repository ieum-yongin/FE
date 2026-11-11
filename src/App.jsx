
import SimulationPage from './components/SimulationPage'
import { useEffect, useMemo, useState } from 'react'
import AlertsPage from './components/AlertsPage'
import StationDataStatus from './components/StationDataStatus'
import StationDetail from './components/StationDetail'
import StationMap from './components/StationMap'
import {
  getStationList,
  getStationDetail,
  USE_STATION_MOCK,
} from './services/stationApi'
import './App.css'

const menus = [
  { id: 'map', label: '지도', icon: '⌖' },
  { id: 'alert', label: '이용 급변 알림', icon: '♧' },
  { id: 'simulation', label: '만약에 시뮬레이션', icon: '➜' },
]

function Sidebar({ activeMenu, onMenuChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-symbol">이음</span>
        <span className="logo-caption">용인 교통 정보</span>
      </div>

      <nav className="sidebar-nav" aria-label="주 메뉴">
        {menus.map(menu => (
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

function MapPage() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

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

  function closeDetail() {
    setSelectedId(null)
    setSelectedStation(null)
    setDetailError('')
  }

  return (
    <div
      className="map-page"
      style={{
        position: 'relative',
        height: 'calc(100vh - 95px)',
        minHeight: 600,
        overflow: 'hidden',
      }}
    >
      <StationMap
        stations={filteredStations}
        selectedStation={selectedStation}
        onSelect={station => setSelectedId(station.id)}
      />

      {/* 정류소 검색 및 목록 */}
      <section
        aria-label="정류소 검색"
        style={{
          position: 'absolute',
          zIndex: 500,
          top: 78,
          left: 22,
          width: 'min(350px, calc(100% - 44px))',
          maxHeight: 'calc(100% - 110px)',
          overflowY: 'auto',
          padding: 18,
          borderRadius: 18,
          background: '#fff',
          boxShadow: '0 6px 25px #0002',
          boxSizing: 'border-box',
        }}
      >
        <h2 style={{ margin: '0 0 7px', fontSize: 20 }}>
          정류소 검색
        </h2>

        <p
          style={{
            fontSize: 12,
            color: '#777',
            marginBottom: 15,
          }}
        >
          {USE_STATION_MOCK
            ? '시연용 데이터 · 실제 위치 아님'
            : 'Django 정류소 조회'}
        </p>

        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="정류소명 또는 번호"
          aria-label="정류소명 또는 번호"
          style={{
            width: '100%',
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 10,
            boxSizing: 'border-box',
            background: '#fff',
            color: '#222',
          }}
        />

        <select
          value={riskFilter}
          onChange={event =>
            setRiskFilter(event.target.value)
          }
          aria-label="위험도 필터"
          style={{
            width: '100%',
            marginTop: 10,
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 10,
            background: '#fff',
            color: '#222',
          }}
        >
          <option value="all">전체 위험도</option>
          <option value="danger">위험</option>
          <option value="warning">주의</option>
          <option value="stable">안정</option>
          <option value="unknown">미분류</option>
        </select>

        <StationDataStatus />

        {loading && <p>정류소 목록 불러오는 중...</p>}

        {error && (
          <div role="alert">
            <p style={{ color: '#c22' }}>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(n => n + 1)}
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <p style={{ fontSize: 13, color: '#777' }}>
              검색 결과 {filteredStations.length}곳
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {filteredStations.length === 0 && (
                <p>검색 결과가 없습니다.</p>
              )}

              {filteredStations.slice(0, 50).map(station => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setSelectedId(station.id)}
                  style={{
                    padding: '12px 14px',
                    border:
                      String(selectedId) === String(station.id)
                        ? '1px solid #20b800'
                        : '1px solid #e5e5e5',
                    borderRadius: 11,
                    background:
                      String(selectedId) === String(station.id)
                        ? '#eaffdf'
                        : '#fafafa',
                    color: '#222',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <strong>{station.name}</strong>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 12,
                      color: '#777',
                    }}
                  >
                    {station.riskLabel || '위험도 미확인'}
                  </span>
                </button>
              ))}
            </div>

            {filteredStations.length > 50 && (
              <p style={{ fontSize: 12, color: '#777' }}>
                목록에는 처음 50개만 표시합니다.
              </p>
            )}
          </>
        )}
      </section>

      {detailLoading && (
        <div
          role="status"
          style={{
            position: 'absolute',
            zIndex: 600,
            top: 18,
            right: 24,
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
            top: 18,
            right: 24,
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
  )
}

function App() {
  const [activeMenu, setActiveMenu] = useState('map')

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
  <SimulationPage />
)}
      </main>
    </div>
  )
}

export default App
