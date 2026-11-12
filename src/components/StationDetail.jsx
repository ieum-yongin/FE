import { useEffect, useState } from 'react'
import busIcon from '../assets/figma/station-bus.svg'
import './StationDetail.css'

const TABS = [
  { id: 'basic', label: '기본 정보' },
  { id: 'usage', label: '사용 정보' },
  { id: 'routes', label: '정류장 정보' },
]

const RISK_INFO = {
  stable: { label: '안정', message: '대체할 노선이 충분한 상태' },
  warning: { label: '주의', message: '노선 연결성에 주의가 필요한 상태' },
  danger: { label: '위험', message: '대중교통 접근성 개선 검토가 필요한 상태' },
  unknown: { label: '자료 없음', message: '위험도 데이터가 없습니다' },
}

function readableNumber(value) {
  const n = Number(value)
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n)
    ? n.toLocaleString('ko-KR') : '—'
}

function InfoRow({ label, value, suffix = '' }) {
  const hasValue = value !== null && value !== undefined && value !== ''
  return (
    <div className="station-detail-info-row">
      <span>{label}</span>
      <strong>{hasValue ? `${value}${suffix}` : '자료 없음'}</strong>
    </div>
  )
}

function BusBadge({ risk = 'unknown', size = 'md' }) {
  return (
    <span className={`station-detail-bus-badge ${risk} ${size}`} aria-hidden="true">
      <img src={busIcon} alt="" />
    </span>
  )
}

function Metric({ label, value, unit = '명', icon = true, emphasized = false }) {
  return (
    <div className={`station-detail-metric ${emphasized ? 'emphasized' : ''}`}>
      {icon && <span className="station-detail-metric-icon" aria-hidden="true">▤</span>}
      <div>
        <span className="station-detail-metric-label">{label}</span>
        <div className="station-detail-metric-value">
          <strong>{readableNumber(value)}</strong>
          {value != null && <small>{unit}</small>}
        </div>
      </div>
    </div>
  )
}

function TransferRing({ value }) {
  const number = Number(value)
  const valid = value !== null && value !== undefined && value !== '' && Number.isFinite(number)
  const percent = valid ? Math.max(0, Math.min(100, number)) : 0

  return (
    <div className="station-detail-transfer">
      <div className="station-detail-transfer-title">환승 비율</div>
      <div
        className={`station-detail-transfer-ring ${valid ? '' : 'empty'}`}
        style={{ '--transfer-percent': `${percent}%` }}
        role={valid ? 'progressbar' : undefined}
        aria-label="환승 비율"
        aria-valuemin={valid ? 0 : undefined}
        aria-valuemax={valid ? 100 : undefined}
        aria-valuenow={valid ? percent : undefined}
      >
        <span>{valid ? `${percent}%` : '—'}</span>
      </div>
      <p>{valid ? `승차 이용자 중 ${percent}%가 다른 노선으로 환승함` : '환승 데이터가 없습니다.'}</p>
    </div>
  )
}

export default function StationDetail({ station, onClose = () => {} }) {
  const [tab, setTab] = useState('basic')
  const info = station ?? {}
  const risk = RISK_INFO[info.risk] ? info.risk : 'unknown'
  const riskInfo = RISK_INFO[risk]
  const isDemo = String(info.id ?? '').startsWith('demo-') || info.isMock === true

  useEffect(() => { setTab('basic') }, [info.id])

  return (
    <aside className="station-detail-panel" aria-label={`${info.name ?? '정류소'} 상세정보`}>
      <div className="station-detail-scroll">
        <header className="station-detail-header">
          <div className="station-detail-topline">
            <span className="station-detail-number">정류소 번호 {info.id ?? '자료 없음'}</span>
            <button type="button" className="station-detail-close" onClick={onClose} aria-label="상세정보 닫기">×</button>
          </div>
          <h2>{info.name ?? '정류소명 미확인'}</h2>
          <p className="station-detail-direction"><span aria-hidden="true">↗</span> {info.direction ?? '방면 정보 없음'}</p>
          {isDemo && <span className="station-detail-demo-label">시연용 정류소</span>}
          <nav className="station-detail-tabs" aria-label="정류소 상세 탭">
            {TABS.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? 'active' : ''} aria-pressed={tab === id}>{label}</button>
            ))}
          </nav>
        </header>

        <div className="station-detail-content">
          {tab === 'basic' && (
            <>
              <section className="station-detail-section station-detail-risk-section">
                <h3>위험도</h3>
                <div className={`station-detail-risk-card ${risk}`}>
                  <BusBadge risk={risk} />
                  <div className="station-detail-risk-text"><strong>{info.riskLabel ?? riskInfo.label}</strong><span>{riskInfo.message}</span></div>
                </div>
                <div className="station-detail-risk-meta">
                  <InfoRow label="지나는 노선의 수" value={info.routeCount} suffix="개" />
                  <InfoRow label="용인시 승차 순위" value={info.rank} suffix="위" />
                </div>
              </section>

              <section className="station-detail-section station-detail-usage-section">
                <h3>정류소 이용 현황</h3>
                <div className="station-detail-usage-grid">
                  <div className="station-detail-usage-metrics">
                    <Metric label="하루 평균 승차" value={info.averageBoarding} emphasized />
                    <Metric label="하루 평균 하차" value={info.averageAlighting} emphasized />
                    <InfoRow label="용인시 승차 순위" value={info.rank} suffix="위" />
                  </div>
                  <TransferRing value={info.transferRate} />
                </div>
              </section>
            </>
          )}

          {tab === 'usage' && (
            <section className="station-detail-section">
              <h3>정류소 이용 현황</h3>
              <div className="station-detail-usage-grid">
                <div className="station-detail-usage-metrics">
                  <Metric label="하루 평균 승차" value={info.averageBoarding} emphasized />
                  <Metric label="하루 평균 하차" value={info.averageAlighting} emphasized />
                  <InfoRow label="지나는 노선의 수" value={info.routeCount} suffix="개" />
                </div>
                <TransferRing value={info.transferRate} />
              </div>
            </section>
          )}

          {tab === 'routes' && (
            <>
              <section className="station-detail-section">
                <h3>정류장 정보</h3>
                <InfoRow label="정류소 번호" value={info.id} />
                <InfoRow label="지나는 노선의 수" value={info.routeCount} suffix="개" />
                <InfoRow label="방면" value={info.direction} />
              </section>
              <section className="station-detail-section">
                <h3>경유 노선</h3>
                {Array.isArray(info.routes) && info.routes.length ? (
                  <div className="station-detail-route-list">
                    {info.routes.map((route, index) => <span className="station-detail-route" key={index}>{typeof route === 'string' ? route : route?.name ?? route?.number ?? '노선 정보'}</span>)}
                  </div>
                ) : <p className="station-detail-note">경유 노선 상세 데이터가 없습니다.</p>}
              </section>
            </>
          )}
        </div>
        <footer className="station-detail-footer">{isDemo ? '현재 표시된 값은 시연용 데이터입니다.' : '제공된 정류소 데이터 기준으로 표시됩니다.'}</footer>
      </div>
    </aside>
  )
}
