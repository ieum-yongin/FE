// 백엔드의 일별 기준 이용량과 관측 이용량을 실측값 그대로 비교합니다.
function parseNumber(value) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
}

export default function AlertDailyChart({ daily }) {
  if (!Array.isArray(daily) || daily.length === 0) {
    return <p className="alerts-chart-empty">표시할 일별 이용량 자료가 없습니다.</p>
  }

  const records = [...daily].sort((a, b) => String(a.service_date).localeCompare(String(b.service_date)))
  const values = records.flatMap(item => [parseNumber(item.baseline_usage), parseNumber(item.observed_usage)]).filter(value => value !== null)
  if (values.length === 0) return <p className="alerts-chart-empty">수집된 이용량 값이 없습니다.</p>

  const W = 350, H = 165, left = 38, right = 12, top = 10, bottom = 34
  const max = Math.max(1, ...values) * 1.12
  const x = index => left + index * (W - left - right) / Math.max(1, records.length - 1)
  const y = value => top + (max - value) / max * (H - top - bottom)
  function segments(key) {
    const parts = []
    let current = []
    records.forEach((record, index) => {
      const n = parseNumber(record[key])
      if (n === null) {
        if (current.length) parts.push(current)
        current = []
      } else current.push([index, n])
    })
    if (current.length) parts.push(current)
    return parts
  }
  return (
    <div className="alerts-chart">
      <h3>일별 사용 추이</h3>
      <div className="alerts-chart-legend"><span className="baseline">이전 기간</span><span className="observed">현재 관측</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="날짜별 평소 기준 이용량과 실제 관측 이용량 비교 차트">
        {[0, 0.5, 1].map(tick => {
          const val = max * tick
          return <g key={tick}><line x1={left} x2={W-right} y1={y(val)} y2={y(val)} stroke="#e8eee6"/><text x={left-5} y={y(val)+4} fontSize="10" textAnchor="end" fill="#777">{Math.round(val).toLocaleString('ko-KR')}</text></g>
        })}
        {[["baseline_usage", "#5063ff"], ["observed_usage", "#ff5050"]].map(([key, color]) => (
          <g key={key}>
            {segments(key).map((part, i) => <polyline key={i} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={part.map(([idx, num]) => `${x(idx)},${y(num)}`).join(' ')}/>)}
            {records.map((record, idx) => {
              const val = parseNumber(record[key])
              return val === null ? null : <circle key={idx} cx={x(idx)} cy={y(val)} r="2.5" fill={color}><title>{`${record.service_date}: ${val.toLocaleString('ko-KR')}명`}</title></circle>
            })}
          </g>
        ))}
        {[0, Math.floor((records.length-1)/2), records.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i => <text key={i} x={x(i)} y={H-11} fontSize="10" fill="#777" textAnchor="middle">{String(records[i].service_date).slice(5)}</text>)}
      </svg>
      
    </div>
  )
}
