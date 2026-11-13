
import { useEffect, useMemo, useState } from 'react'
import { getAlerts, USE_MOCK } from '../services/alerts'
import FigmaUiIcon from './FigmaUiIcon'
import './AlertsPage.css'

// Mock 7개 중 4개를 우선 표시해 '더 보기' 동작도 테스트할 수 있게 합니다.
const INITIAL_VISIBLE_COUNT = 7

const STATUS_LABEL = {
  needs_review: '확인 필요',
  expected: '예상된 변화',
}

const FILTERS = [
  ['all', '전체'],
  ['needs_review', '확인 필요'],
  ['expected', '예상된 변화'],
]

function ChangeIcon({ type }) {
  return (
    <span
      className={`alert-change-icon ${type}`}
      aria-hidden="true"
    >
      {type === 'increase' ? '↑' : '↓'}
    </span>
  )
}

export default function AlertsPage() {
  // API 데이터
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // 화면 상태
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showGuide, setShowGuide] = useState(true)
  const [showMore, setShowMore] = useState(false)

  // 알림 데이터 불러오기
  useEffect(() => {
    const controller = new AbortController()

    async function loadAlerts() {
      try {
        setLoading(true)
        setError('')

        const data = await getAlerts({
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setAlerts(data)
          setSelectedId(current => data.some(item => String(item.id) === String(current)) ? current : null)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err?.message || '알림 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAlerts()

    return () => controller.abort()
  }, [reloadKey])

  // 상태별 개수 계산
  const counts = useMemo(() => ({
    all: alerts.length,
    needs_review: alerts.filter(
      a => a.status === 'needs_review'
    ).length,
    expected: alerts.filter(
      a => a.status === 'expected'
    ).length,
  }), [alerts])

  // 필터 및 검색
  const filtered = useMemo(() => {
    return alerts.filter(alert => {
      const matchesFilter =
        filter === 'all' || alert.status === filter

      const matchesQuery =
        `${alert.stationName} ${alert.stationId}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())

      return matchesFilter && matchesQuery
    })
  }, [alerts, filter, query])

  const selected = alerts.find(
    alert => alert.id === selectedId
  )

  const visible = showMore
    ? filtered
    : filtered.slice(0, INITIAL_VISIBLE_COUNT)

  // 상태 변경: 서버 저장은 추후 구현
  function updateStatus(id, status) {
    setAlerts(current => current.map(alert =>
      alert.id === id
        ? { ...alert, status }
        : alert
    ))
  }

  return (
    <div className="alerts-page">
      {/* 지도 API 연결 전 임시 지도 */}
      <div
        className="alerts-map"
        aria-label="정류소 위치 시연용 배경"
      >
        <div className="alerts-road road-a" />
        <div className="alerts-road road-b" />
        <div className="alerts-road road-c" />

        <span className="alerts-map-label label-a">
          처인구
        </span>
        <span className="alerts-map-label label-b">
          기흥구
        </span>
        <span className="alerts-map-label label-c">
          수지구
        </span>

        {(USE_MOCK ? filtered : []).map(alert => (
          <button
            type="button"
            key={alert.id}
            className={
              `alerts-map-pin ${alert.type} ${
                selectedId === alert.id
                  ? 'is-selected'
                  : ''
              }`
            }
            style={{
              left: `${alert.x ?? 50}%`,
              top: `${alert.y ?? 50}%`,
            }}
            onClick={() => setSelectedId(alert.id)}
            title={`${alert.stationName} 상세 보기`}
            aria-label={`${alert.stationName} 알림 선택`}
          >
            {alert.type === 'increase' ? '↑' : '↓'}
          </button>
        ))}
      </div>

      <div className="alerts-map-message">
        {USE_MOCK ? "ⓘ 시연용 정류소 위치입니다" : "ⓘ 실제 알림의 좌표 표시는 백엔드 데이터 연결 후 제공됩니다"}
      </div>

      <span className="alerts-demo-label">
        {USE_MOCK
          ? '시연용 데이터 · 지도 연결 전'
          : '지도 연결 전'}
      </span>

      {/* 알림 목록 */}
      <section
        className="alerts-panel"
        aria-label="이용 급변 알림 목록"
      >
        <div className="alerts-panel-heading">
          <h1><FigmaUiIcon name="alert" className="alerts-heading-icon" />이용 급변 알림</h1>

          <p>
            평소 대비 7일 연속 크게 변한 정류소를
            자동으로 탐지해요.
          </p>
        </div>

        <div
          className="alerts-filters"
          aria-label="알림 상태 필터"
        >
          {FILTERS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={
                filter === value ? 'active' : ''
              }
              onClick={() => {
                setFilter(value)
                setShowMore(false)
              }}
              aria-pressed={filter === value}
            >
              {label} <strong>{counts[value]}</strong>
            </button>
          ))}
        </div>

        <label
          className="alerts-search-label"
          htmlFor="alerts-search"
        >
          정류소 검색
        </label>

        <input
          id="alerts-search"
          className="alerts-search"
          placeholder="정류소명 또는 번호"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setShowMore(false)
          }}
        />

        <div className="alerts-list" aria-busy={loading}>
          {loading && (
            <div className="alerts-data-state" role="status">
              <span className="alerts-state-spinner" aria-hidden="true" />
              <strong>알림을 불러오는 중입니다</strong>
              <p>이용 급변 정보를 확인하고 있어요.</p>
            </div>
          )}

          {!loading && error && (
            <div className="alerts-data-state alerts-data-state--error" role="alert">
              <strong>알림 정보를 불러오지 못했습니다</strong>
              <p>{error}</p>
              <button type="button" onClick={() => setReloadKey(key => key + 1)}>
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="alerts-data-state" role="status">
              <strong>{alerts.length === 0 ? '등록된 급변 알림이 없습니다' : '검색 결과가 없습니다'}</strong>
              <p>{alerts.length === 0
                ? '새로운 급변 알림이 등록되면 이곳에 표시됩니다.'
                : '검색어 또는 알림 상태 필터를 변경해 보세요.'}</p>
              {alerts.length === 0 && !USE_MOCK && (
                <button type="button" onClick={() => setReloadKey(key => key + 1)}>
                  새로고침
                </button>
              )}
              {alerts.length > 0 && (
                <button type="button" onClick={() => { setQuery(''); setFilter('all'); setShowMore(false) }}>
                  필터 초기화
                </button>
              )}
            </div>
          )}

          {!loading &&
            !error &&
            visible.map(alert => (
              <button
                key={alert.id}
                type="button"
                className={
                  `alerts-list-item ${
                    selectedId === alert.id
                      ? 'selected'
                      : ''
                  }`
                }
                onClick={() => setSelectedId(alert.id)}
              >
                <ChangeIcon type={alert.type} />

                <span className="alerts-item-text">
                  <strong>{alert.stationName}</strong>

                  <span>
                    {alert.period}
                    {' / 평소 대비 '}
                    {alert.ratio == null ? '자료 없음' : `${alert.ratio}배`}
                  </span>
                </span>

                <span
                  className={
                    `alerts-status ${alert.status}`
                  }
                >
                  {STATUS_LABEL[alert.status] ?? '미분류'}
                </span>

                <span
                  className="alerts-chevron"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>
            ))}
        </div>

        {filtered.length > INITIAL_VISIBLE_COUNT && (
          <button
            type="button"
            className="alerts-more"
            onClick={() => setShowMore(v => !v)}
          >
            {showMore
              ? '접기'
              : `${filtered.length - INITIAL_VISIBLE_COUNT}곳 더 보기`}
            <span className={`alerts-more-chevron ${showMore ? 'up' : ''}`} aria-hidden="true">⌄</span>
          </button>
        )}
      </section>

      {/* 선택한 정류소 상세정보 */}
      {selected && (
        <section
          className="alerts-detail"
          aria-label="선택한 알림 상세"
        >
          <button
            type="button"
            className="alerts-close"
            onClick={() => setSelectedId(null)}
            aria-label="상세 닫기"
          >
            ×
          </button>

          <h2>{selected.stationName}</h2>

          <span
            className={
              `alerts-status ${selected.status}`
            }
          >
            {STATUS_LABEL[selected.status] ?? '미분류'}
          </span>

          <p>
            <strong>변화 유형</strong>
            {' · '}
            이용 {selected.type === 'increase'
              ? '증가'
              : '감소'}
          </p>

          <p>
            <strong>탐지 기간</strong>
            {' · '}
            {selected.period}
          </p>

          <p>
            <strong>변화량</strong>
            {' · '}
            평소 대비 {selected.ratio}배
          </p>

          {selected.reason && (
            <p>
              <strong>참고</strong>
              {' · '}
              {selected.reason}
            </p>
          )}

          <div className="alerts-detail-actions">
            <button
              type="button"
              onClick={() => updateStatus(
                selected.id,
                'needs_review'
              )}
            >
              확인 필요
            </button>

            <button
              type="button"
              onClick={() => updateStatus(
                selected.id,
                'expected'
              )}
            >
              예상된 변화
            </button>
          </div>

          <small>
            상태 변경은 현재 화면에서만 유지돼요.
            서버에는 저장되지 않습니다.
          </small>
        </section>
      )}

      {/* 변화 유형 및 분류 기준 안내 */}
      {showGuide ? (
        <section
          className="alerts-guide"
          aria-label="이용 급변 알림 안내"
        >
          <button
            type="button"
            className="alerts-close"
            onClick={() => setShowGuide(false)}
            aria-label="안내 닫기"
          >
            ×
          </button>

          <div>
            <h2>변화 유형</h2>

            <p>
              <ChangeIcon type="decrease" />
              이용 감소 (평소 대비)
            </p>

            <p>
              <ChangeIcon type="increase" />
              이용 증가 (평소 대비)
            </p>
          </div>

          <div className="alerts-guide-classification">
            <h2>분류 기준</h2>

            <p>
              <span className="alerts-status needs_review">
                확인 필요
              </span>
              원인 파악이 필요한 급변화
            </p>

            <p>
              <span className="alerts-status expected">
                예상된 변화
              </span>
              방학, 학사일정 등으로 예상되는 변화
            </p>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="alerts-guide-toggle"
          onClick={() => setShowGuide(true)}
        >
          안내 보기
        </button>
      )}
    </div>
  )
}
