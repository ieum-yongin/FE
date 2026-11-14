import { useEffect, useState } from 'react'
import busIcon from '../assets/figma/station-bus.svg'
import './StationDetail.css'

const TABS = [
  { id: 'basic', label: '기본 정보' },
  { id: 'usage', label: '사용 정보' },
  { id: 'routes', label: '정류장 정보' },
]
const RISK = {
  stable: { label: '안정', reason: '대체할 노선이 충분함' },
  warning: { label: '주의', reason: '일부 노선의 대체가 어려움' },
  danger: { label: '위험', reason: '대체 노선이 부족함' },
  unknown: { label: '자료 없음', reason: '위험도를 산정할 데이터가 없음' },
}
function shown(value, unit = '') {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString('ko-KR')}${unit}`
}
function DetailIcon({ name, size = 18 }) {
  const paths = {
    routes: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
    people: <><circle cx="9" cy="8" r="2"/><circle cx="17" cy="9" r="1.6"/><path d="M4 19v-2a5 5 0 0 1 10 0v2M15 15a4 4 0 0 1 5 4"/></>,
    substitute: <><path d="M4 8a8 8 0 0 1 14-3l2 2M20 3v4h-4M20 16a8 8 0 0 1-14 3l-2-2M4 21v-4h4"/></>,
    boarding: <><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M8 7h8M7 13h10M8 19v2M16 19v2"/><circle cx="9" cy="16" r=".6"/><circle cx="15" cy="16" r=".6"/></>,
    alighting: <><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M8 7h8M7 13h10M8 19v2M16 19v2"/><circle cx="9" cy="16" r=".6"/><circle cx="15" cy="16" r=".6"/></>,
    trophy: <><path d="M7 4h10v7a5 5 0 0 1-10 0V4ZM7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4M12 16v4M8 21h8"/></>,
    transfer: <><path d="M4 9a8 8 0 0 1 14-3l2 2M20 4v4h-4M20 15a8 8 0 0 1-14 3l-2-2M4 20v-4h4"/></>,
    stop: <><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.stop}</svg>
}
function MiniRow({ icon, label, value, unit, prefix = '' }) {
  return <div className="sd-mini-row"><span className="sd-mini-label"><span className="sd-mini-icon" aria-hidden="true"><DetailIcon name={icon}/></span>{label}</span><strong>{prefix}{shown(value, unit)}</strong></div>
}
function BusBadge({ risk }) {
  return <span className={`sd-bus ${risk}`} aria-hidden="true"><img src={busIcon} alt="" /></span>
}
function Donut({ value }) {
  const number = Number(value)
  const valid = value !== null && value !== undefined && value !== '' && Number.isFinite(number)
  const pct = valid ? Math.min(100, Math.max(0, number)) : 0
  return <div className="sd-donut-side">
    <div className="sd-donut-label"><DetailIcon name="transfer" size={16} /> 환승 비율</div>
    <div className={`sd-donut ${valid ? '' : 'is-empty'}`} style={{ '--sd-pct': `${pct}%` }} role={valid ? 'progressbar' : undefined} aria-valuemin={valid ? 0 : undefined} aria-valuemax={valid ? 100 : undefined} aria-valuenow={valid ? pct : undefined} aria-label="환승 비율">
      <span>{valid ? `${Math.round(pct)}%` : '데이터 없음'}</span>
    </div>
    <div className="sd-donut-caption">{valid ? `승차 중 ${Math.round(pct)}%가 다른 노선으로 환승함` : '10월 환승 승차 데이터 미제공'}</div>
  </div>
}
const WEEKDAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' }
const WEEKDAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function UsageTrend({ data }) {
  const records = Array.isArray(data) ? data : []
  const width = 360, height = 146, left = 30, right = 12, top = 14, bottom = 24
  const innerW = width - left - right, innerH = height - top - bottom
  const maximum = Math.max(1, ...records.flatMap(w => [Number(w.boarding_count) || 0, Number(w.alighting_count) || 0]))
  const axisMax = Math.ceil(maximum / 10) * 10 || 10
  const getX = i => left + (records.length < 2 ? innerW / 2 : i * innerW / (records.length - 1))
  const getY = v => top + innerH * (1 - (Number(v) || 0) / axisMax)
  const line = field => records.map((v,i) => `${getX(i)},${getY(v[field])}`).join(' ')
  return <section className="sd-tab-section">
    <div className="sd-section-heading"><h3>주별 이용 추이</h3><div className="sd-chart-legend"><span className="sd-key board"/>승차 <span className="sd-key alight"/>하차</div></div>
    {records.length ? <>
      <svg className="sd-trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="주별 승차 및 하차 건수 추이">
        {[0,0.5,1].map((ratio,i) => <g key={ratio}><line x1={left} x2={width-right} y1={top+innerH*ratio} y2={top+innerH*ratio} stroke="#ddd"/><text x={left-7} y={top+innerH*ratio+4} textAnchor="end" fill="#7b7b7b" fontSize="10">{Math.round(axisMax*(1-ratio)).toLocaleString('ko-KR')}</text></g>)}
        <polyline fill="none" stroke="#5963ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line('boarding_count')}/>
        <polyline fill="none" stroke="#f26c6c" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" points={line('alighting_count')}/>
        {records.map((w,i) => <text key={i} x={getX(i)} y={height-7} textAnchor="middle" fill="#888" fontSize="10">{`${Number(String(w.week_start).slice(5,7))}/${Number(String(w.week_start).slice(8,10))}`}</text>)}
      </svg>
      <p className="sd-chart-caption">주별 승하차 합계 · 각 날짜는 해당 주의 시작일</p>
    </> : <p className="sd-tab-empty">주별 이용 데이터가 없습니다.</p>}
  </section>
}
function WeekdayBars({ data }) {
  const records = (Array.isArray(data) ? data : []).slice().sort((a,b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday))
  const max = Math.max(1, ...records.map(x => Number(x.average_boarding)||0))
  const amountFor = (days) => records.filter(entry => days.includes(entry.weekday) && Number.isFinite(Number(entry.average_boarding))).map(entry => Number(entry.average_boarding))
  const avg = values => values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null
  const weekdayMean = avg(amountFor(['MON','TUE','WED','THU','FRI']))
  const weekendMean = avg(amountFor(['SAT','SUN']))
  const fmt = amount => amount.toLocaleString('ko-KR', {maximumFractionDigits: 1})
  let summary = '요일별 승차량에 관한 비교 데이터가 충분하지 않습니다.'
  if (weekdayMean !== null && weekendMean !== null) {
    const difference = weekdayMean - weekendMean
    if (Math.abs(difference) < 0.5) summary = `평일 평균 ${fmt(weekdayMean)}명, 주말 평균 ${fmt(weekendMean)}명으로 이용량이 비슷합니다.`
    else if (difference > 0) summary = `평일 평균 ${fmt(weekdayMean)}명으로 주말 평균 ${fmt(weekendMean)}명보다 승차량이 많습니다.`
    else summary = `주말 평균 ${fmt(weekendMean)}명으로 평일 평균 ${fmt(weekdayMean)}명보다 승차량이 많습니다.`
  }
  return <section className="sd-tab-section">
    <div className="sd-section-heading"><h3>요일별 평균 승차</h3><small>일평균 · 명</small></div>
    {records.length ? <>
      <div className="sd-weekdays">{records.map((entry) => {
        const amount = Number(entry.average_boarding) || 0
        return <div className="sd-weekday" key={entry.weekday} title={`${WEEKDAY_LABELS[entry.weekday]||entry.weekday}: ${shown(amount,'명')}`}>
          <span className="sd-weekday-val">{amount.toLocaleString('ko-KR',{maximumFractionDigits:1})}</span>
          <div className="sd-bar-track"><div className={`sd-bar ${['SAT','SUN'].includes(entry.weekday)?'weekend':''}`} style={{height:`${Math.max(2,(amount/max)*100)}%`}}/></div>
          <span className="sd-weekday-name">{WEEKDAY_LABELS[entry.weekday]||entry.weekday}</span>
        </div>
      })}</div>
      <p className="sd-tip">{summary}</p><p className="sd-chart-caption">요일별 하차량은 제공되지 않아 승차량만 비교합니다.</p>
    </> : <p className="sd-tab-empty">요일별 평균 승차 데이터가 없습니다.</p>}
  </section>
}
function StationProfile({ info }) {
  const ratioRaw = info.boardingRatio
  const ratio = ratioRaw == null || !Number.isFinite(Number(ratioRaw)) ? null : Math.max(0,Math.min(100,Number(ratioRaw)*100))
  const profileLabels = {ARRIVAL:'하차 중심', DEPARTURE:'승차 중심', BALANCED:'승하차 균형'}
  const profile = profileLabels[info.stopProfile] || (ratio !== null ? (ratio < 45 ? '하차 중심' : ratio > 55 ? '승차 중심' : '승하차 균형') : '분류 정보 없음')
  const profileSummary = ratio === null
    ? '승하차 비중을 확인할 수 없습니다.'
    : ratio < 45
      ? `하차 비중이 ${(100-ratio).toFixed(1)}%로 승차보다 높아 하차 중심 정류소입니다.`
      : ratio > 55
        ? `승차 비중이 ${ratio.toFixed(1)}%로 하차보다 높아 승차 중심 정류소입니다.`
        : `승차 ${ratio.toFixed(1)}%, 하차 ${(100-ratio).toFixed(1)}%로 승하차 비중이 비슷합니다.`
  return <section className="sd-tab-section sd-profile">
    <div className="sd-section-heading"><h3>정류소 성격</h3><small>{profile}</small></div>
    {ratio !== null ? <>
      <div className="sd-profile-ratio"><span>승차 {ratio.toFixed(1)}%</span><span>하차 {(100-ratio).toFixed(1)}%</span></div>
      <div className="sd-profile-track"><div style={{width:`${ratio}%`}}/></div>
      <p className="sd-tip">{profileSummary}</p><p className="sd-chart-caption">승하차 비중이며 환승 비율과는 다른 지표입니다.</p>
    </> : <p className="sd-tab-empty">승하차 비중 데이터가 없습니다.</p>}
  </section>
}
function StationUsageTab({ info }) {
  return <main className="sd-main sd-tab-main">
    <UsageTrend data={info.weeklyUsage}/>
    <WeekdayBars data={info.weekdayUsage}/>
    <StationProfile info={info}/>
  </main>
}
function StationRoutesTab({ info }) {
  const nearby = (Array.isArray(info.nearbyStations) ? info.nearbyStations : []).filter(s => Number.isFinite(Number(s.distance_m)) && Number(s.distance_m) <= 300).sort((a,b) => a.distance_m-b.distance_m)
  const routes = Array.isArray(info.routes) ? info.routes : []
  const max = Math.max(1,...nearby.map(s => Number(s.average_daily_boarding)||0))
  const routeNumbers = [...new Set(routes.map(r => String(typeof r === 'string' ? r : r?.route_number ?? r?.name ?? r?.number ?? '').trim()).filter(Boolean))]
  const routeSummary = routeNumbers.length
    ? `이 정류소를 경유하는 노선은 ${routeNumbers.map(n => `${n}번`).join(', ')}이며, 총 ${routeNumbers.length}개입니다.`
    : '이 정류소를 경유하는 노선 목록이 제공되지 않았습니다.'
  return <main className="sd-main sd-tab-main">
    <section className="sd-tab-section">
      <div className="sd-section-heading"><h3>반경 300m 주변 정류소</h3><small>직선거리 기준</small></div>
      {nearby.length ? <div className="sd-nearby-list">{nearby.map(s => <div className="sd-nearby" key={s.id}>
        <div className="sd-nearby-line"><span title={s.name}>{s.name}</span><small>{shown(s.average_daily_boarding,'명/일')} · {Math.round(s.distance_m)}m</small></div>
        <div className="sd-nearby-track"><div style={{width:`${Math.max(2,(Number(s.average_daily_boarding)||0)/max*100)}%`}}/></div>
      </div>)}</div> : <p className="sd-tab-empty">300m 이내 주변 정류소 정보가 없습니다.</p>}
      <p className="sd-chart-caption">막대는 주변 정류소 간 평균 일일 승차량의 상대적 크기입니다.</p>
    </section>
    <section className="sd-tab-section">
      <div className="sd-section-heading"><h3>지나는 노선</h3><small>{shown(routes.length,'개 노선')}</small></div>
      {routes.length ? <div className="sd-route-table"><div className="sd-route-table-header"><span>노선번호</span><span>노선 유형</span></div>{routes.map((r,i) => <div className="sd-route-table-row" key={r?.id??i}><strong>{typeof r==='string'?r:r?.route_number??r?.name??r?.number??'—'}</strong><span>{typeof r==='object'?(r?.route_type_name??(r?.route_type!=null?`유형 코드 ${r.route_type}`:'정보 없음')):'정보 없음'}</span></div>)}</div> : <p className="sd-tab-empty">이 정류소를 경유하는 노선 정보가 없습니다.</p>}
      <p className="sd-tip">{routeSummary}</p>
    </section>
  </main>
}
function UsagePanel({ info }) {
  return <section className="sd-usage">
    <div className="sd-metrics">
      <div className="sd-metric"><span className="sd-metric-icon"><DetailIcon name="boarding" size={24}/></span><div><span className="sd-muted">하루 평균 승차</span><strong>{shown(info.averageBoarding, '명')}</strong></div></div>
      <div className="sd-metric"><span className="sd-metric-icon"><DetailIcon name="alighting" size={24}/></span><div><span className="sd-muted">하루 평균 하차</span><strong>{shown(info.averageAlighting, '명')}</strong></div></div>
      <div className="sd-metric"><span className="sd-metric-icon sd-trophy"><DetailIcon name="trophy" size={24}/></span><div><span className="sd-muted">용인 순위</span><strong>{shown(info.rank, '위')}</strong>{info.rankTotal != null && <small>{shown(info.rankTotal, '곳 중')}</small>}</div></div>
    </div>
    <Donut value={info.transferRate} />
  </section>
}
export default function StationDetail({ station, extraLoad = { loading: false, errors: [] }, onRetryExtra = () => {}, onClose = () => {} }) {
  const [tab, setTab] = useState('basic')
  const info = station ?? {}
  const risk = RISK[info.risk] ? info.risk : 'unknown'
  const riskData = RISK[risk]
  const metrics = info.riskMetrics ?? {}
  const isMock = info.isMock || String(info.id ?? '').startsWith('demo-')
  useEffect(() => { setTab('basic') }, [info.id])
  return <aside className="station-detail-panel" aria-label={`${info.name ?? '정류소'} 상세 정보`}>
    <div className="sd-scroll">
      <header className="sd-header">
        <button className="sd-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <h2>{info.name ?? '정류소명 미확인'}</h2>
        <div className="sd-subtitle"><b>{info.stopNumber ?? info.id ?? '—'}</b><span>{info.direction ?? '방면 정보 없음'}</span></div>
        {isMock && <div className="sd-mock">시연용 데이터</div>}
        <nav className="sd-tabs" aria-label="정류소 상세 탭">{TABS.map(t => <button key={t.id} type="button" className={tab === t.id ? 'selected' : ''} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}>{t.label}</button>)}</nav>
      </header>
      {tab === 'basic' && <main className="sd-main">
        <section className="sd-risk">
          <h3>위험도</h3>
          <div className="sd-risk-head"><BusBadge risk={risk}/><div><strong className={`sd-risk-name ${risk}`}>{info.riskLabel || riskData.label}</strong><p>{info.riskReason || riskData.reason}</p></div></div>
          <div className="sd-risk-box">
            <MiniRow icon="routes" label="지나는 노선의 수" value={info.routeCount ?? metrics.serving_route_count} unit="개" />
            <MiniRow icon="people" label="노선 대비 사용량 (용인 내)" value={metrics.passengers_per_route} unit="명" prefix="" />
            <MiniRow icon="substitute" label="노선이 멈췄을 때 대체 노선" value={metrics.min_alternative_routes} unit="개" />
          </div>
        </section>
        <UsagePanel info={info}/>
      </main>}
      {tab !== 'basic' && extraLoad.loading && <div className="sd-api-status" role="status">정류소 데이터를 조회하는 중입니다…</div>}
      {tab !== 'basic' && extraLoad.errors.length > 0 && <div className="sd-api-error" role="alert">
        <strong>추가 데이터 조회 실패</strong>
        {extraLoad.errors.map((message, idx) => <p key={idx}>{message}</p>)}
        <button type="button" onClick={onRetryExtra}>다시 조회</button>
      </div>}
      {tab === 'usage' && <StationUsageTab info={info}/>}
      {tab === 'routes' && <StationRoutesTab info={info}/>}
    </div>
  </aside>
}
