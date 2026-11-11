
import { useEffect, useMemo, useState } from 'react'
import SimulationResult from './SimulationResult'
import {
  getRoutes,
  createSimulation,
  getSimulation,
  getSimulationStops,
  USE_SIMULATION_MOCK,
} from '../services/simulations'
import './SimulationPage.css'

function getRouteDescription(route) {
  const direction = `${route.from} ↔ ${route.to}`

  return route.stops == null
    ? direction
    : `${direction} / 정류소 ${route.stops}곳`
}

export default function SimulationPage() {
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)
  const [routesError, setRoutesError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const [result, setResult] = useState(null)
  const [resultRoutes, setResultRoutes] = useState([])
  const [running, setRunning] = useState(false)
  const [simulationError, setSimulationError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadRoutes() {
      setRoutesLoading(true)
      setRoutesError('')

      try {
        const data = await getRoutes({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setRoutes(data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRoutesError(error.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setRoutesLoading(false)
        }
      }
    }

    loadRoutes()

    return () => controller.abort()
  }, [reloadKey])

  const availableRoutes = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return routes.filter(route => {
      const alreadySelected = selectedIds.some(
        id => String(id) === String(route.id)
      )

      const searchable =
        `${route.number} ${route.from} ${route.to}`
          .toLowerCase()

      return (
        !alreadySelected &&
        searchable.includes(keyword)
      )
    })
  }, [routes, selectedIds, query])

  const selectedRoutes = useMemo(
    () =>
      selectedIds
        .map(id =>
          routes.find(
            route => String(route.id) === String(id)
          )
        )
        .filter(Boolean),
    [selectedIds, routes]
  )

  function clearResult() {
    setResult(null)
    setResultRoutes([])
    setSimulationError('')
  }

  function addRoute(id) {
    if (running) return

    setSelectedIds(current =>
      current.some(
        selected => String(selected) === String(id)
      )
        ? current
        : [...current, id]
    )

    setQuery('')
    clearResult()
  }

  function removeRoute(id) {
    if (running) return

    setSelectedIds(current =>
      current.filter(
        selected => String(selected) !== String(id)
      )
    )

    clearResult()
  }

  function resetSimulation() {
    if (running) return

    setSelectedIds([])
    setQuery('')
    clearResult()
  }

  async function runSimulation() {
    if (selectedIds.length === 0 || running) return

    setRunning(true)
    setSimulationError('')
    setResult(null)
    setResultRoutes([])

    const snapshotRoutes = [...selectedRoutes]

    try {
      const created = await createSimulation(selectedIds)

      if (!created || typeof created !== 'object') {
        throw new Error(
          '시뮬레이션 생성 응답이 올바르지 않습니다.'
        )
      }

      if (USE_SIMULATION_MOCK) {
        setResult(created)
        setResultRoutes(snapshotRoutes)
        return
      }

      const simulationId =
        created.id ?? created.simulation_id

      let finalResult = { ...created }

      if (simulationId !== null &&
          simulationId !== undefined) {
        try {
          const detail = await getSimulation(simulationId)

          if (detail && typeof detail === 'object') {
            finalResult = {
              ...finalResult,
              ...detail,
            }
          }
        } catch (error) {
          finalResult.detailFetchError = error.message
        }

        try {
          const stopsResponse =
            await getSimulationStops(simulationId)

          const stops = Array.isArray(stopsResponse)
            ? stopsResponse
            : stopsResponse?.results

          if (Array.isArray(stops)) {
            finalResult.affectedStops = stops
          }
        } catch (error) {
          finalResult.stopsFetchError = error.message
        }
      }

      setResult(finalResult)
      setResultRoutes(snapshotRoutes)
    } catch (error) {
      setSimulationError(error.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="simulation-page">
      <div
        className="simulation-background"
        aria-hidden="true"
      >
        <span className="simulation-map-label one">
          처인구
        </span>
        <span className="simulation-map-label two">
          기흥구
        </span>
        <span className="simulation-map-label three">
          수지구
        </span>
      </div>

      <section className="simulation-panel">
        <header className="simulation-heading">
          <h1>
            <span aria-hidden="true">➜</span>
            만약에 시뮬레이션
          </h1>

          <p>
            노선을 바꾸기 전에 그 영향을 미리
            확인하는 화면이에요.
          </p>
        </header>

        <div className="simulation-form">
          <h2>노선 고르기</h2>

          <label
            className="simulation-search-wrap"
            htmlFor="simulation-route-search"
          >
            <span aria-hidden="true">⌕</span>

            <input
              id="simulation-route-search"
              type="search"
              placeholder="노선 번호 검색"
              value={query}
              disabled={running}
              onChange={event =>
                setQuery(event.target.value)
              }
            />
          </label>

          {routesLoading && (
            <p className="simulation-helper">
              노선 목록을 불러오는 중...
            </p>
          )}

          {routesError && (
            <div role="alert">
              <p className="simulation-warning">
                {routesError}
              </p>

              <button
                type="button"
                className="simulation-reset"
                onClick={() =>
                  setReloadKey(value => value + 1)
                }
              >
                다시 시도
              </button>
            </div>
          )}

          {!routesLoading && !routesError && (
            <div className="simulation-search-results">
              {availableRoutes.map(route => (
                <button
                  type="button"
                  key={route.id}
                  className="simulation-search-option"
                  disabled={running}
                  onClick={() => addRoute(route.id)}
                >
                  <span>
                    <strong>{route.number}</strong>
                    <small>
                      {getRouteDescription(route)}
                    </small>
                  </span>

                  <span>추가 +</span>
                </button>
              ))}

              {availableRoutes.length === 0 && (
                <p className="simulation-helper">
                  {query.trim()
                    ? '검색 결과가 없습니다.'
                    : '추가할 노선이 없습니다.'}
                </p>
              )}
            </div>
          )}

          <div className="simulation-selected">
            {selectedRoutes.map(route => (
              <div
                className="simulation-route-card"
                key={route.id}
              >
                <div className="simulation-bus-icon">
                  <span aria-hidden="true">▣</span>
                </div>

                <div className="simulation-route-info">
                  <strong>{route.number}</strong>
                  <span>
                    {getRouteDescription(route)}
                  </span>
                </div>

                <button
                  type="button"
                  className="simulation-remove"
                  disabled={running}
                  onClick={() => removeRoute(route.id)}
                  aria-label={`${route.number} 제거`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="simulation-add-guide">
            <span aria-hidden="true">＋</span>
            노선 하나 더 끄기
          </div>

          <button
            type="button"
            className="simulation-run"
            disabled={
              selectedIds.length === 0 ||
              routesLoading ||
              running
            }
            onClick={runSimulation}
          >
            {running
              ? '시뮬레이션 요청 중...'
              : '시뮬레이션 실행'}
          </button>

          <button
            type="button"
            className="simulation-reset"
            disabled={running}
            onClick={resetSimulation}
          >
            선택 초기화
          </button>

          {simulationError && (
            <p
              className="simulation-warning"
              role="alert"
            >
              {simulationError}
            </p>
          )}

          <p className="simulation-helper">
            {USE_SIMULATION_MOCK
              ? '현재는 시연용 노선 데이터입니다.'
              : 'Django API 연결 모드입니다.'}
          </p>
        </div>
      </section>

      {result && (
        <SimulationResult
          result={result}
          selectedRoutes={resultRoutes}
          onClose={() => {
            setResult(null)
            setResultRoutes([])
          }}
        />
      )}

      <div className="simulation-demo-badge">
        {USE_SIMULATION_MOCK
          ? '시연용 데이터 · 실제 영향 분석 없음'
          : 'Django API 연결 모드'}
      </div>
    </div>
  )
}
