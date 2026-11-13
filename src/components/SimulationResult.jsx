import { useMemo, useState } from 'react'
import { downloadSimulationPdf } from '../services/simulations'

const RISK_NAMES = { SAFE: '안전', CAUTION: '주의', DANGER: '위험', UNKNOWN: '미분류' }
const riskLabel = value => RISK_NAMES[String(value ?? 'UNKNOWN').toUpperCase()] || '미분류'
const riskStyle = value => `simulation-risk-${String(value ?? 'UNKNOWN').toLowerCase()}`

export default function SimulationResult({ result, selectedRoutes = [], onClose, onSelectStop }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const isMock = result?.mode === 'mock'
  const completed = result?.status === 'COMPLETED'
  const summary = completed ? result?.summary : null
  const stops = useMemo(() => Array.isArray(result?.affectedStops) ? result.affectedStops : [], [result])
  const filtered = useMemo(() => stops.filter(stop => String(stop.name ?? '').toLowerCase().includes(query.trim().toLowerCase())), [stops, query])
  const visible = expanded ? filtered : filtered.slice(0, 3)
  const fmt = n => n == null || !Number.isFinite(Number(n)) ? '자료 없음' : Math.round(Number(n)).toLocaleString('ko-KR')
  const countLabel = n => n == null ? '자료 없음' : `${fmt(n)}곳`

  async function handleSave() {
    if (saving || !completed || isMock) return
    setSaving(true)
    setSaveError('')
    setSaveMessage('')
    try {
      await downloadSimulationPdf(result.id ?? result.simulation_id)
      setSaveMessage('PDF 다운로드를 시작했습니다.')
    } catch (error) {
      setSaveError(error?.message || 'PDF 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="simulation-result" aria-label="시뮬레이션 결과">
      <div className="simulation-result-divider" />
      <div className="simulation-result-heading">
        <h2>이 노선을 멈추면</h2>
        <button type="button" onClick={onClose} aria-label="결과 닫기">×</button>
      </div>
      {!isMock && !completed && <p className="simulation-warning">분석 상태: {result?.status ?? '확인 중'} · 분석이 완료되어야 결과를 볼 수 있어요.</p>}
      {isMock && <p className="simulation-warning">시연용 모드에서는 실제 교통 영향 분석을 제공하지 않습니다.</p>}
      {completed && summary && (
        <>
          <div className="simulation-stat-grid" aria-label="시뮬레이션 결과 요약">
            <div className="simulation-stat danger"><div>🔴 빨간불</div><strong>{countLabel(summary.danger_stop_count)}</strong></div>
            <div className="simulation-stat warning"><div>🟡 노란불</div><strong>{countLabel(summary.caution_stop_count)}</strong></div>
            <div className="simulation-stat people"><div>👥 영향 인원</div><strong>{summary.estimated_affected_daily == null ? '자료 없음' : `${fmt(summary.estimated_affected_daily)}명/일`}</strong></div>
          </div>
          <p className="simulation-result-note">백엔드에서 계산한 시뮬레이션 분석 결과입니다.</p>
        </>
      )}
      {completed && !summary && <p className="simulation-warning">분석이 완료됐지만 결과 요약 데이터가 없습니다.</p>}
      <h3 className="simulation-affected-title">위험도가 바뀌는 정류소</h3>
      {completed && (
        <>
          <label className="simulation-stop-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={event => { setQuery(event.target.value); setExpanded(false) }} placeholder="정류소명 검색" aria-label="변경 정류소 검색" />
          </label>
          <div className="simulation-affected-list">
            {visible.map((stop, index) => (
              <button type="button" key={`${stop.id ?? index}-${index}`} className="simulation-affected-row" onClick={() => onSelectStop?.(stop)} title="지도에서 이 정류소 보기">
                <span className="simulation-pin" aria-hidden="true">♧</span>
                <strong>{stop.name || '정류소명 미확인'}</strong>
                <span className={`simulation-risk-before ${riskStyle(stop.before_risk_level)}`}>{riskLabel(stop.before_risk_level)}</span>
                <span aria-hidden="true">→</span>
                <span className={`simulation-risk-after ${riskStyle(stop.after_risk_level)}`}>{riskLabel(stop.after_risk_level)}</span>
              </button>
            ))}
            {!filtered.length && <div className="simulation-empty-stops">{stops.length ? '검색 조건에 맞는 정류소가 없습니다.' : '변경된 위험도 정류소가 없습니다.'}</div>}
          </div>
          {filtered.length > 3 && <button type="button" className="simulation-more" onClick={() => setExpanded(v => !v)}>{expanded ? '접기 ⌃' : `${filtered.length - 3}곳 더 보기 ⌄`}</button>}
          {result.stopsCount > stops.length && <p className="simulation-result-note">전체 {fmt(result.stopsCount)}곳 중 {fmt(stops.length)}곳을 불러왔습니다.</p>}
        </>
      )}
      {completed && !isMock && (
        <>
          <button type="button" className="simulation-save" onClick={handleSave} disabled={saving} aria-busy={saving}>
            {saving ? 'PDF 생성 중...' : '결과 저장 (PDF)'}
          </button>
          {saveError && <p role="alert" className="simulation-warning">{saveError}</p>}
          {saveMessage && <p role="status" className="simulation-save-success">{saveMessage}</p>}
        </>
      )}
      {!isMock && (result.detailFetchError || result.stopsFetchError) && <p className="simulation-warning">{result.detailFetchError || result.stopsFetchError}</p>}
      {!isMock && <details className="simulation-server-details"><summary>서버 응답 확인</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>}
    </section>
  )
}
