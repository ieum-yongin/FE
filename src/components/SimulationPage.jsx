import { useEffect, useMemo, useRef, useState } from 'react'
import StationMap from './StationMap'
import SimulationResult from './SimulationResult'
import { getStationList } from '../services/stationApi'
import { getRoutes, createSimulation, getSimulation, getSimulationStops, USE_SIMULATION_MOCK } from '../services/simulations'
import FigmaUiIcon from './FigmaUiIcon'
import './SimulationPage.css'

function routeDescription(route) {
  const direction = `${route.from} ↔ ${route.to}`
  return route.stops == null ? direction : `${direction} / 정류소 ${route.stops}곳`
}

export default function SimulationPage() {
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [routesError, setRoutesError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [mapStations, setMapStations] = useState([])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [suspendedIds, setSuspendedIds] = useState([])
  const [result, setResult] = useState(null)
  const [resultRoutes, setResultRoutes] = useState([])
  const [running, setRunning] = useState(false)
  const [simulationError, setSimulationError] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setRoutesLoading(true)
      setRoutesError('')
      try {
        const data = await getRoutes({ signal: controller.signal })
        if (!controller.signal.aborted) setRoutes(data)
      } catch (error) {
        if (!controller.signal.aborted) setRoutesError(error.message)
      } finally {
        if (!controller.signal.aborted) setRoutesLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    const controller = new AbortController()
    getStationList({ signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setMapStations(data) })
      .catch(() => { /* 지도 데이터가 없어도 시뮬레이션 입력은 사용할 수 있음 */ })
    return () => controller.abort()
  }, [])

  const selectedRoutes = useMemo(() => selectedIds
    .map(id => routes.find(route => String(route.id) === String(id)))
    .filter(Boolean), [selectedIds, routes])
  const availableRoutes = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return routes.filter(route =>
      !selectedIds.some(id => String(id) === String(route.id)) &&
      `${route.number} ${route.from} ${route.to}`.toLowerCase().includes(keyword)
    )
  }, [routes, selectedIds, query])

  function clearResult() {
    setResult(null)
    setResultRoutes([])
    setSimulationError('')
  }
  function addRoute(id) {
    if (running) return
    setSelectedIds(current => current.some(value => String(value) === String(id)) ? current : [...current, id])
    setSuspendedIds(current => current.some(value => String(value) === String(id)) ? current : [...current, id])
    setQuery('')
    setSearchOpen(false)
    clearResult()
  }
  function removeRoute(id) {
    if (running) return
    setSelectedIds(current => current.filter(value => String(value) !== String(id)))
    setSuspendedIds(current => current.filter(value => String(value) !== String(id)))
    clearResult()
  }
  function resetSimulation() {
    if (running) return
    setSelectedIds([])
    setSuspendedIds([])
    setQuery('')
    setSearchOpen(false)
    clearResult()
  }
  function toggleRoute(id) {
    if (running) return
    setSuspendedIds(current => current.some(value => String(value) === String(id))
      ? current.filter(value => String(value) !== String(id))
      : [...current, id])
    clearResult()
  }
  async function runSimulation() {
    if (!suspendedIds.length || running) return
    setRunning(true)
    setSimulationError('')
    setResult(null)
    const snapshot = selectedRoutes.filter(route => suspendedIds.some(id => String(route.id) === String(id)))
    try {
      const created = await createSimulation(suspendedIds)
      if (!created || typeof created !== 'object') throw new Error('시뮬레이션 응답이 올바르지 않습니다.')
      let finalResult = { ...created }
      if (!USE_SIMULATION_MOCK) {
        const id = created.id ?? created.simulation_id
        if (id != null) {
          try {
            const detail = await getSimulation(id)
            if (detail && typeof detail === 'object') finalResult = { ...finalResult, ...detail }
          } catch (error) { finalResult.detailFetchError = error.message }
          try {
            const response = await getSimulationStops(id)
            const stops = Array.isArray(response) ? response : response?.results
            if (Array.isArray(stops)) finalResult.affectedStops = stops
          } catch (error) { finalResult.stopsFetchError = error.message }
        }
      }
      setResult(finalResult)
      setResultRoutes(snapshot)
    } catch (error) {
      setSimulationError(error.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="simulation-page">
      <div className="simulation-map-background">
        <StationMap stations={mapStations} onSelect={() => {}} />
      </div>
      <section className="simulation-panel" aria-label="만약에 시뮬레이션">
        <div className="simulation-panel-scroll">
          <header className="simulation-heading">
            <div className="simulation-heading-row">
              <h1><FigmaUiIcon name="simulation" className="simulation-heading-icon" />만약에 시뮬레이션</h1>
              <button type="button" className="simulation-close-result" onClick={resetSimulation} disabled={running} title="시뮬레이션 초기화" aria-label="시뮬레이션 초기화">×</button>
            </div>
            <p>노선을 바꾸기 전에 그 영향을 미리 확인하는 화면이에요.</p>
          </header>
          <div className="simulation-form">
            <h2>노선 고르기</h2>
            <div className="simulation-search-block" ref={searchRef}>
              <label className="simulation-search-wrap" htmlFor="simulation-route-search">
                <FigmaUiIcon name="search" className="simulation-search-icon" />
                <input id="simulation-route-search" type="search" placeholder="노선 번호 검색" value={query} disabled={running}
                  onFocus={() => setSearchOpen(true)} onChange={event => { setQuery(event.target.value); setSearchOpen(true) }} />
              </label>
              {searchOpen && !routesLoading && !routesError && (
                <div className="simulation-search-results" role="listbox" aria-label="검색된 노선">
                  {availableRoutes.length ? availableRoutes.map(route => (
                    <button type="button" key={route.id} className="simulation-search-option"
                      onClick={() => addRoute(route.id)} disabled={running}>
                      <span><strong>{route.number}</strong><small>{routeDescription(route)}</small></span>
                      <span>선택 +</span>
                    </button>
                  )) : <p className="simulation-helper">검색 결과가 없습니다.</p>}
                  <button type="button" className="simulation-search-dismiss" onClick={() => setSearchOpen(false)}>검색 목록 닫기</button>
                </div>
              )}
            </div>
            {routesLoading && <p className="simulation-helper">노선 목록을 불러오는 중...</p>}
            {routesError && <div role="alert"><p className="simulation-warning">{routesError}</p><button type="button" className="simulation-text-button" onClick={() => setReloadKey(value => value + 1)}>다시 시도</button></div>}
            <div className="simulation-selected">
              {selectedRoutes.map(route => (
                <div className={`simulation-route-card ${suspendedIds.some(id => String(id) === String(route.id)) ? 'is-suspended' : 'is-running'}`} key={route.id}>
                  <FigmaUiIcon name="routeBus" className="simulation-bus-icon" />
                  <div className="simulation-route-info"><strong>{route.number}</strong><small>{routeDescription(route)}</small></div>
                  <span className="simulation-route-status">{suspendedIds.some(id => String(id) === String(route.id)) ? '운행 중단' : '운행 유지'}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={suspendedIds.some(id => String(id) === String(route.id))}
                    aria-label={`${route.number} 운행 중단 설정`}
                    className="simulation-route-switch"
                    disabled={running}
                    onClick={() => toggleRoute(route.id)}
                  ><span className="simulation-route-switch-thumb" /></button>
                  <button type="button" className="simulation-remove" disabled={running} onClick={() => removeRoute(route.id)} aria-label={`${route.number} 목록에서 제거`}>×</button>
                </div>
              ))}
            </div>
            <button type="button" className="simulation-add-guide" disabled={running || routesLoading} onClick={() => {
              setSearchOpen(true)
              searchRef.current?.querySelector('input')?.focus()
            }}><FigmaUiIcon name="plus" className="simulation-plus-icon" />노선 하나 더 끄기</button>
            {!result && (
              <div className="simulation-actions">
                <button type="button" className="simulation-run" disabled={!suspendedIds.length || routesLoading || running} onClick={runSimulation}>
                  {running ? '시뮬레이션 실행 중...' : '운행 중단 시뮬레이션 실행'}
                </button>
                <button type="button" className="simulation-text-button" disabled={running} onClick={resetSimulation}>선택 초기화</button>
              </div>
            )}
            {selectedIds.length > 0 && !suspendedIds.length && <p className="simulation-helper">운행 중단할 노선의 스위치를 켜 주세요.</p>}
            {simulationError && <p role="alert" className="simulation-warning">{simulationError}</p>}
          </div>
          {result && <SimulationResult result={result} selectedRoutes={resultRoutes} onClose={() => setResult(null)} />}
        </div>
      </section>
      <div className="simulation-demo-badge">{USE_SIMULATION_MOCK ? '시연용 데이터 · 실제 영향 분석 아님' : 'Django API 연결 모드'}</div>
    </div>
  )
}
