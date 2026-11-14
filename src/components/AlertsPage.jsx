
import { useEffect, useMemo, useState } from 'react'
import { getAlerts, getAlertDetail, postAlertReview, USE_MOCK } from '../services/alerts'
import FigmaUiIcon from './FigmaUiIcon'
import AlertsLeafletMap from './AlertsLeafletMap'
import AlertDailyChart from './AlertDailyChart'
import { getStationMap } from '../services/stationApi'
import './AlertsPage.css'

// 리스트가 길어지면 더보기로 표시합니다.
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
      {type === 'increase' ? '▲' : '▼'}
    </span>
  )
}

export default function AlertsPage() {
  // API 데이터
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [stationPositions, setStationPositions] = useState(new Map())
  const [mapLocationError, setMapLocationError] = useState('')

  // 화면 상태
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showGuide, setShowGuide] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [detailTab, setDetailTab] = useState('trend')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [reviewStatus, setReviewStatus] = useState(null)

  // 정류소 선택이 바뀌면 이전 알림의 메모 및 검토 메시지를 지웁니다.
  useEffect(() => {
    setDetailTab('trend')
    setReviewNote('')
    setReviewError('')
    setReviewSuccess('')
    setReviewStatus(null)
  }, [selectedId])

  async function saveReview(statusAfter) {
    if (selectedId == null || reviewSaving || USE_MOCK) return
    if (!['REVIEWING', 'RESOLVED'].includes(statusAfter)) return
    const alertId = selectedId
    setReviewSaving(true)
    setReviewError('')
    setReviewSuccess('')
    try {
      await postAlertReview(alertId, {
        status_after: statusAfter,
        note: reviewNote.trim() || null,
      })
      // 다른 알림으로 이동 중이었으면 이전 알림의 성공 상태를 표시하지 않습니다.
      setReviewStatus(statusAfter)
      setReviewSuccess(statusAfter === 'REVIEWING' ? '검토 시작이 저장되었습니다.' : '검토 완료가 저장되었습니다.')
      setDetailReloadKey(key => key + 1)
      setReloadKey(key => key + 1)
    } catch (err) {
      setReviewError(err?.data?.message || err?.message || '검토 상태 저장에 실패했습니다.')
    } finally {
      setReviewSaving(false)
    }
  }

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

  // 상세 데이터는 알림 선택 시에만 조회. 빠르게 다른 알림을 선택해도 이전 응답으로 덮어쓰지 않도록 취소합니다.
  useEffect(() => {
    if (selectedId == null) return
    const controller = new AbortController()
    async function loadDetail() {
      try {
        setDetailLoading(true)
        setDetail(null)
        setDetailError('')
        const data = await getAlertDetail(selectedId, { signal: controller.signal })
        if (!controller.signal.aborted) setDetail(data)
      } catch (err) {
        if (!controller.signal.aborted) setDetailError(err?.message || '알림 상세 조회에 실패했습니다.')
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false)
      }
    }
    loadDetail()
    return () => controller.abort()
  }, [selectedId, detailReloadKey])

  // 알림이 있을 때만 지도 정류소 위치 조회 (전체 정류소 페이지 순회 없음).
  useEffect(() => {
    if (USE_MOCK || alerts.length === 0) {
      setStationPositions(new Map())
      setMapLocationError('')
      return
    }
    const controller = new AbortController()
    getStationMap({ signal: controller.signal })
      .then(stations => {
        if (controller.signal.aborted) return
        setStationPositions(new Map(stations.map(station => [String(station.id), station])))
        setMapLocationError('')
      })
      .catch(err => {
        if (!controller.signal.aborted) setMapLocationError(err?.message || '정류소 좌표를 조회하지 못했습니다.')
      })
    return () => controller.abort()
  }, [alerts])

  // 알림에 정류소 좌표가 없을 때 지도 API의 정류소 ID로 연결합니다.
  const geoAlerts = useMemo(() => alerts.map(alert => {
    const station = stationPositions.get(String(alert.stationId))
    return {
      ...alert,
      latitude: alert.latitude ?? station?.latitude ?? null,
      longitude: alert.longitude ?? station?.longitude ?? null,
    }
  }), [alerts, stationPositions])

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

  const selected = geoAlerts.find(
    alert => String(alert.id) === String(selectedId)
  )

  const visible = showMore
    ? filtered
    : filtered.slice(0, INITIAL_VISIBLE_COUNT)


  return (
    <div className={`alerts-page${selected ? ' has-selected-alert' : ''}`}>
      <AlertsLeafletMap
        alerts={geoAlerts}
        selected={selected}
        onSelect={setSelectedId}
      />
      {!loading && !error && alerts.length === 0 && (
        <div className="alerts-map-message">ⓘ 현재 등록된 이용 급변 알림이 없습니다.</div>
      )}
      {mapLocationError && alerts.length > 0 && (
        <div className="alerts-map-message" role="status">ⓘ 알림 위치 조회 실패: {mapLocationError}</div>
      )}
      {USE_MOCK && (
        <span className="alerts-demo-label">시연용 알림 · 실제 좌표 미제공</span>
      )}

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
          <div className="alerts-detail-header">
            <div className="alerts-detail-header-title">
              <div className="alerts-detail-title-row">
                <h2>{selected.stationName}</h2>
                <span className={`alerts-status ${selected.status}`}>
                  {STATUS_LABEL[selected.status] ?? '미분류'}
                </span>
              </div>
              <p className="alerts-detail-subtitle">
                {selected.stationId != null ? `정류소 번호 ${selected.stationId}` : '급변 알림 정류소'}
                <span className="alerts-detail-period">{' · '}{selected.period}</span>
              </p>
            </div>
            <button
              type="button"
              className="alerts-close alerts-detail-close"
              onClick={() => setSelectedId(null)}
              aria-label="상세 닫기"
            >
              ×
            </button>
          </div>

          <div className="alerts-figma-summary">
            <div className="alerts-figma-metrics">
              <div>
                <span>평소 하루 이용량(승차+하차)</span>
                <strong className="is-figma-count">{detail?.baseline_daily_usage == null ? '자료 없음' : `${Number(detail.baseline_daily_usage).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}명`}</strong>
              </div>
              <div>
                <span>변화 정도</span>
                {detail?.usage_ratio != null && Number.isFinite(Number(detail.usage_ratio)) ? (
                  <strong className="is-figma-count">
                    평소의 {Math.round(Number(detail.usage_ratio) * 100)}% 수준
                    <small>({Number(detail.usage_ratio) >= 1 ? '+' : ''}{Math.round((Number(detail.usage_ratio) - 1) * 100)}%)</small>
                  </strong>
                ) : (
                  <strong className="is-figma-count">{selected.ratio == null ? '자료 없음' : `평소 ${selected.ratio}배`}</strong>
                )}
              </div>
            </div>
          </div>

          <div className="alerts-detail-tabs" role="tablist" aria-label="알림 상세 정보">
            <button type="button" role="tab" aria-selected={detailTab === 'trend'} className={detailTab === 'trend' ? 'active' : ''} onClick={() => setDetailTab('trend')}>이용 추이</button>
            <button type="button" role="tab" aria-selected={detailTab === 'station'} className={detailTab === 'station' ? 'active' : ''} onClick={() => setDetailTab('station')}>정류소 정보</button>
          </div>

          {detailTab === 'trend' ? (
            <div role="tabpanel" className="alerts-detail-data" aria-busy={detailLoading}>
              {detailLoading && <p role="status">일별 이용량 데이터를 불러오는 중입니다.</p>}
              {detailError && (
                <div role="alert" className="alerts-detail-error">
                  <p>{detailError}</p>
                  <button type="button" onClick={() => setDetailReloadKey(value => value + 1)}>다시 시도</button>
                </div>
              )}
              {!detailLoading && !detailError && detail && (
                <>
                  <AlertDailyChart daily={detail.daily} />
                </>
              )}
            </div>
          ) : (
            <div role="tabpanel" className="alerts-station-info">
              <p><strong>정류소</strong><span>{selected.stationName}</span></p>
              <p><strong>정류소 ID</strong><span>{selected.stationId ?? '자료 없음'}</span></p>
              <p><strong>탐지 기간</strong><span>{selected.period}</span></p>
              <p><strong>분류</strong><span>{STATUS_LABEL[selected.status] ?? '미분류'}</span></p>
            </div>
          )}

          {(detail?.analysis_summary || detail?.reason || selected.reason) && (
            <section className="alerts-analysis-summary" aria-label="분석 요약">
              <strong>분석 요약</strong>
              <p>{detail?.analysis_summary || detail?.reason || selected.reason}</p>
            </section>
          )}

          <div className="alerts-review-area">
            <div className="alerts-review-heading">
              <label className="alerts-review-label" htmlFor="alerts-review-note">원인 메모</label>
              <span className="alerts-review-current">{({
                NEW: '신규', REVIEWING: '검토 중', RESOLVED: '검토 완료',
              })[reviewStatus ?? detail?.review_status ?? selected.review_status] ?? '상태 확인 중'}</span>
            </div>
            <textarea
              id="alerts-review-note"
              className="alerts-review-note"
              rows={3}
              maxLength={1000}
              placeholder="예) 정류소 공사, 노선 변경, 운영 시간 조정 등"
              value={reviewNote}
              disabled={reviewSaving || USE_MOCK}
              onChange={e => setReviewNote(e.target.value)}
            />
            <div className="alerts-detail-actions">
              <button type="button" onClick={() => saveReview((reviewStatus ?? detail?.review_status ?? selected.review_status) === 'REVIEWING' ? 'RESOLVED' : 'REVIEWING')} disabled={reviewSaving || detailLoading || USE_MOCK}>
                {reviewSaving ? '저장 중…' : ((reviewStatus ?? detail?.review_status ?? selected.review_status) === 'REVIEWING' ? '✓ 검토 완료로 표시' : '✓ 검토 중으로 표시')}
              </button>
              {(reviewStatus ?? detail?.review_status ?? selected.review_status) === 'RESOLVED' && (
                <button type="button" className="alerts-review-reopen" onClick={() => saveReview('REVIEWING')} disabled={reviewSaving || detailLoading || USE_MOCK}>검토 다시 시작</button>
              )}
            </div>
            {reviewError && <p className="alerts-review-feedback is-error" role="alert">{reviewError}</p>}
            {reviewSuccess && <p className="alerts-review-feedback is-success" role="status">{reviewSuccess}</p>}
            {USE_MOCK && <small>시연용 모드에서는 검토 이력을 저장할 수 없습니다.</small>}
          </div>
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
