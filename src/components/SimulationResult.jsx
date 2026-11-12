import { useMemo, useState } from 'react'

function riskText(value) {
  if (value === 'danger' || value === '위험') return '위험'
  if (value === 'warning' || value === '주의') return '주의'
  if (value === 'stable' || value === '안정') return '안정'
  return value == null ? '미확인' : String(value)
}

function normalizeStop(stop, index) {
  if (typeof stop === 'string') return { id: index, name: stop, before: null, after: null }
  return {
    id: stop.id ?? stop.station_id ?? stop.stop_id ?? index,
    name: stop.name ?? stop.station_name ?? stop.stop_name ?? '정류소명 미확인',
    before: stop.before_risk ?? stop.previous_risk ?? stop.risk_before ?? null,
    after: stop.after_risk ?? stop.new_risk ?? stop.risk_after ?? null,
  }
}

function downloadScenario(result, selectedRoutes) {
  const payload = {
    exportedAt: new Date().toISOString(),
    isDemo: result?.mode === 'mock',
    selectedRoutes: selectedRoutes.map(route => ({ id: route.id, number: route.number, from: route.from, to: route.to })),
    result,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ieum-simulation-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export default function SimulationResult({ result, selectedRoutes = [], onClose }) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const isMock = result?.mode === 'mock'
  const rawStops = Array.isArray(result?.affectedStops) ? result.affectedStops : null
  const stops = useMemo(() => rawStops?.map(normalizeStop) ?? [], [rawStops])
  const filtered = stops.filter(stop => stop.name.toLowerCase().includes(query.trim().toLowerCase()))
  const visible = expanded ? filtered : filtered.slice(0, 3)
  const counts = result?.summary ?? result?.impacts ?? null
  const dangerCount = counts?.danger_count ?? counts?.dangerCount ?? null
  const warningCount = counts?.warning_count ?? counts?.warningCount ?? null
  const people = counts?.affected_passengers ?? counts?.affectedPassengers ?? null
  const format = (n, suffix) => n == null ? '—' : `${Number(n).toLocaleString('ko-KR')}${suffix}`

  return (
    <div className="simulation-result" aria-label="시뮬레이션 결과">
      <div className="simulation-result-divider" />
      <h2>이 노선을 멈추면</h2>
      <div className="simulation-stat-grid">
        <div className="simulation-stat danger"><div><span>⚠</span> 빨간불</div><strong>{format(dangerCount, '곳')}</strong></div>
        <div className="simulation-stat warning"><div><span>⚠</span> 노란불</div><strong>{format(warningCount, '곳')}</strong></div>
        <div className="simulation-stat people"><div><span>♙</span> 영향 승객</div><strong>{format(people, '명/일')}</strong></div>
      </div>
      {isMock ? (
        <p className="simulation-result-note">현재는 시연용 모드라 실제 위험도 변화와 승객 영향 수치를 계산하지 않습니다. ‘—’는 계산 결과가 없다는 뜻입니다.</p>
      ) : (dangerCount == null && warningCount == null && people == null) ? (
        <p className="simulation-result-note">서버에서 위험도 요약 수치를 반환하지 않았습니다.</p>
      ) : null}
      <h2 className="simulation-affected-title">위험도가 바뀌는 정류소</h2>
      {rawStops && stops.length > 0 ? (
        <>
          <label className="simulation-stop-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="정류소명 검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <div className="simulation-affected-list">
            {visible.map(stop => (
              <div className="simulation-affected-row" key={String(stop.id)}>
                <span className="simulation-pin" aria-hidden="true">♧</span>
                <strong>{stop.name}</strong>
                <span className="simulation-risk-before">{riskText(stop.before)}</span><span aria-hidden="true">→</span>
                <span className="simulation-risk-after">{riskText(stop.after)}</span>
              </div>
            ))}
            {!filtered.length && <p className="simulation-helper">검색 결과가 없습니다.</p>}
          </div>
          {filtered.length > 3 && <button type="button" className="simulation-more" onClick={() => setExpanded(!expanded)}>{expanded ? '접기' : `${filtered.length - 3}곳 더 보기 ›`}</button>}
        </>
      ) : <p className="simulation-empty-stops">{isMock ? '시연용 모드에서는 영향받는 정류소를 산출하지 않습니다.' : rawStops ? '변경된 정류소가 반환되지 않았습니다.' : '정류소 영향 분석 결과가 아직 없습니다.'}</p>}
      {result?.detailFetchError && <p className="simulation-warning">상세 조회 오류: {result.detailFetchError}</p>}
      {result?.stopsFetchError && <p className="simulation-warning">정류소 조회 오류: {result.stopsFetchError}</p>}
      <button type="button" className="simulation-save" onClick={() => downloadScenario(result, selectedRoutes)}>결과 저장</button>
      <button type="button" className="simulation-text-button" onClick={onClose}>노선 다시 선택하기</button>
      <p className="simulation-result-note">결과 저장은 현재 화면의 시나리오를 JSON 파일로 내려받습니다. 서버 저장 기능은 아직 연결되지 않았습니다.</p>
    </div>
  )
}
