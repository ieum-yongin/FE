
import { useState } from 'react'
import './StationDetail.css'

const TABS = [
  { id: 'basic', label: '기본 정보' },
  { id: 'usage', label: '사용 정보' },
  { id: 'routes', label: '정류장 정보' },
]

// 시연용 데이터입니다. 실제 용인시 공식 데이터가 아닙니다.
const DEMO_STATION = {
  id: '56582',
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
  routes: [],
}

function InfoRow({ label, value, suffix = '' }) {
  return (
    <div className="station-detail-info-row">
      <span>{label}</span>
      <strong>
        {value ?? '자료 없음'}
        {value != null && suffix}
      </strong>
    </div>
  )
}

export default function StationDetail({
  station = DEMO_STATION,
  onClose = () => {},
}) {
  const [tab, setTab] = useState('basic')

  const info = { ...DEMO_STATION, ...station }

  const riskClass = ['stable', 'warning', 'danger'].includes(
    info.risk
  )
    ? info.risk
    : 'unknown'

  return (
    <aside
      className="station-detail-panel"
      aria-label={`${info.name} 정류소 상세정보`}
    >
      <header className="station-detail-header">
        <div className="station-detail-topline">
          <span className="station-detail-number">
            정류소 번호 {info.id}
          </span>

          <button
            type="button"
            className="station-detail-close"
            onClick={onClose}
            aria-label="정류소 상세정보 닫기"
          >
            ×
          </button>
        </div>

        <h2>{info.name}</h2>
        <p className="station-detail-direction">
          <span aria-hidden="true">↗</span>
          {info.direction}
        </p>

        <div className="station-detail-period">
          기간: {info.period}
        </div>
      </header>

      <nav
        className="station-detail-tabs"
        aria-label="정류소 상세 탭"
      >
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="station-detail-content">
        {tab === 'basic' && (
          <>
            <section className="station-detail-section">
              <h3>정류소 위험도</h3>

              <div className="station-detail-risk-card">
                <span
                  className={`station-detail-risk-dot ${riskClass}`}
                />
                <div>
                  <strong>{info.riskLabel}</strong>
                  <p>
                    {info.risk === 'stable'
                      ? '대체할 노선이 충분한 상태'
                      : info.risk === 'warning'
                        ? '노선 연결성에 주의가 필요한 상태'
                        : info.risk === 'danger'
                          ? '대중교통 접근성 개선 검토가 필요한 상태'
                          : '위험도 데이터가 없습니다'}
                  </p>
                </div>
              </div>
            </section>

            <section className="station-detail-section">
              <h3>정류소 이용 현황</h3>

              <div className="station-detail-stats">
                <div>
                  <span>하루 평균 승차</span>
                  <strong>
                    {info.averageBoarding?.toLocaleString()
                      ?? '—'}
                    <small>명</small>
                  </strong>
                </div>

                <div>
                  <span>하루 평균 하차</span>
                  <strong>
                    {info.averageAlighting?.toLocaleString()
                      ?? '—'}
                    <small>명</small>
                  </strong>
                </div>
              </div>

              <InfoRow
                label="지나는 노선의 수"
                value={info.routeCount}
                suffix="개"
              />
              <InfoRow
                label="용인시 승차 순위"
                value={info.rank}
                suffix="위"
              />
            </section>
          </>
        )}

        {tab === 'usage' && (
          <>
            <section className="station-detail-section">
              <h3>정류소 사용 정보</h3>

              <div className="station-detail-stats">
                <div>
                  <span>평균 승차 인원</span>
                  <strong>
                    {info.averageBoarding?.toLocaleString()
                      ?? '—'}
                    <small>명</small>
                  </strong>
                </div>

                <div>
                  <span>평균 하차 인원</span>
                  <strong>
                    {info.averageAlighting?.toLocaleString()
                      ?? '—'}
                    <small>명</small>
                  </strong>
                </div>
              </div>
            </section>

            <section className="station-detail-section">
              <h3>환승 비율</h3>

              {info.transferRate != null ? (
                <>
                  <div className="station-detail-big-number">
                    {info.transferRate}%
                  </div>

                  <div
                    className="station-detail-progress"
                    role="progressbar"
                    aria-label="환승 비율"
                    aria-valuenow={info.transferRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, info.transferRate)
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="station-detail-note">
                    승차 이용자 중 다른 노선으로 환승한
                    비율을 나타냅니다.
                  </p>
                </>
              ) : (
                <p className="station-detail-note">
                  환승 비율 데이터가 없습니다.
                </p>
              )}
            </section>
          </>
        )}

        {tab === 'routes' && (
          <>
            <section className="station-detail-section">
              <h3>정류장 정보</h3>

              <InfoRow
                label="정류소 번호"
                value={info.id}
              />
              <InfoRow
                label="운행 노선 수"
                value={info.routeCount}
                suffix="개"
              />
              <InfoRow
                label="방면"
                value={info.direction}
              />
            </section>

            <section className="station-detail-section">
              <h3>경유 노선</h3>

              {info.routes?.length > 0 ? (
                <div className="station-detail-route-list">
                  {info.routes.map((route, index) => (
                    <span
                      key={`${route}-${index}`}
                      className="station-detail-route"
                    >
                      {route}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="station-detail-note">
                  노선별 상세 정보는 API 연결 후
                  표시됩니다.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <footer className="station-detail-footer">
        현재 표시된 값은 시연용 데이터입니다.
      </footer>
    </aside>
  )
}