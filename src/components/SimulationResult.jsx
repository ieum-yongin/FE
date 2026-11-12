
import { useMemo, useState } from 'react'

// 백엔드 응답 형식이 확정되면 이 함수에서 필드명을 맞추면 됩니다.
function normalizeStop(stop, index) {
  if (typeof stop === 'string') {
    return {
      id: `stop-${index}`,
      name: stop,
      number: null,
      impact: null,
    }
  }

  return {
    id:
      stop.id ??
      stop.station_id ??
      stop.stop_id ??
      `stop-${index}`,
    name:
      stop.name ??
      stop.station_name ??
      stop.stop_name ??
      '정류소명 미확인',
    number:
      stop.station_number ??
      stop.stop_number ??
      null,
    impact:
      stop.impact_description ??
      stop.impact_label ??
      null,
  }
}

export default function SimulationResult({
  result,
  selectedRoutes = [],
  onClose,
}) {
  const [query, setQuery] = useState('')
  const [showAllStops, setShowAllStops] = useState(false)

  const isMock = result?.mode === 'mock'

  const simulationId =
    result?.id ?? result?.simulation_id ?? null

  const rawStops = Array.isArray(result?.affectedStops)
    ? result.affectedStops
    : null

  const stops = useMemo(
    () =>
      rawStops
        ? rawStops.map(normalizeStop)
        : [],
    [rawStops]
  )

  const filteredStops = stops.filter(stop =>
    `${stop.name} ${stop.number ?? ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )

  return (
    <section
      className="simulation-result"
      aria-label="시뮬레이션 결과"
    >
      <div className="simulation-result-heading">
        <h2>
          {isMock
            ? '시나리오 설정 완료'
            : '시뮬레이션 결과'}
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="결과 닫기"
        >
          ×
        </button>
      </div>

      <p>운행 중단을 가정한 노선</p>

      <div className="simulation-result-routes">
        {selectedRoutes.map(route => (
          <span key={route.id}>
            {route.number}
          </span>
        ))}
      </div>

      <div className="simulation-result-summary">
        <span>선택한 노선</span>
        <strong>{selectedRoutes.length}개</strong>
      </div>

      {!isMock && (
        <>
          <div className="simulation-result-summary">
            <span>시뮬레이션 ID</span>
            <strong>{simulationId ?? '미확인'}</strong>
          </div>

          <div className="simulation-result-summary">
            <span>처리 상태</span>
            <strong>
              {result?.status ?? '미확인'}
            </strong>
          </div>
        </>
      )}

      <div
        style={{
          paddingTop: 18,
          marginTop: 8,
          borderTop: '1px solid #eee',
        }}
      >
        <h3
          style={{
            margin: '0 0 10px',
            fontSize: 17,
          }}
        >
          영향을 받는 정류소
        </h3>

        {isMock ? (
          <p className="simulation-warning">
            시연용 모드에서는 실제 영향을 받는 정류소와
            교통 위험도를 계산하지 않습니다.
          </p>
        ) : rawStops === null ? (
          <p className="simulation-warning">
            정류소 영향 분석 데이터가 아직 반환되지
            않았습니다. 분석 완료 여부를 확인해야 합니다.
          </p>
        ) : (
          <>
            <div className="simulation-result-summary">
              <span>서버에서 반환한 정류소 항목</span>
              <strong>{stops.length}개</strong>
            </div>

            {stops.length > 0 && (
              <>
                <input
                  type="search"
                  value={query}
                  onChange={event =>
                    setQuery(event.target.value)
                  }
                  placeholder="영향 정류소 검색"
                  aria-label="영향받는 정류소 검색"
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    margin: '12px 0',
                    border: '1px solid #ddd',
                    borderRadius: 9,
                    background: '#fff',
                    color: '#222',
                    boxSizing: 'border-box',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 260,
                    overflowY: 'auto',
                  }}
                >
                  {(showAllStops ? filteredStops : filteredStops.slice(0, 3)).map((stop, index) => (
                    <div
                      key={`${stop.id}-${index}`}
                      style={{
                        padding: 12,
                        border: '1px solid #e7e7e7',
                        borderRadius: 10,
                        background: '#fafcf9',
                      }}
                    >
                      <strong
                        style={{
                          display: 'block',
                          fontSize: 14,
                        }}
                      >
                        {stop.name}
                      </strong>

                      {stop.number != null && (
                        <span
                          style={{
                            display: 'block',
                            marginTop: 5,
                            color: '#777',
                            fontSize: 12,
                          }}
                        >
                          정류소 번호: {stop.number}
                        </span>
                      )}

                      {stop.impact && (
                        <span
                          style={{
                            display: 'block',
                            marginTop: 5,
                            color: '#a45c16',
                            fontSize: 12,
                          }}
                        >
                          {stop.impact}
                        </span>
                      )}
                    </div>
                  ))}

                  {filteredStops.length === 0 && (
                    <p
                      style={{
                        color: '#777',
                        fontSize: 13,
                      }}
                    >
                      검색 결과가 없습니다.
                    </p>
                  )}
                </div>
                {filteredStops.length > 3 && (
                  <button type="button" className="simulation-more" onClick={() => setShowAllStops(value => !value)}>
                    {showAllStops ? '접기' : `${filteredStops.length - 3}곳 더 보기`} <span aria-hidden="true">{showAllStops ? '⌃' : '⌄'}</span>
                  </button>
                )}
              </>
            )}

            {stops.length === 0 && (
              <p
                style={{
                  color: '#777',
                  fontSize: 13,
                }}
              >
                서버에서 반환한 정류소 항목이 없습니다.
              </p>
            )}
          </>
        )}
      </div>

      {!isMock && (
        <>
          {result.detailFetchError && (
            <p className="simulation-warning">
              상세 조회 오류: {result.detailFetchError}
            </p>
          )}

          {result.stopsFetchError && (
            <p className="simulation-warning">
              정류소 조회 오류: {result.stopsFetchError}
            </p>
          )}

          <details style={{ marginTop: 18 }}>
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              서버 원본 응답 확인
            </summary>

            <pre
              style={{
                maxHeight: 200,
                overflow: 'auto',
                padding: 12,
                borderRadius: 8,
                background: '#f5f5f5',
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </>
      )}
    </section>
  )
}
