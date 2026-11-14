
import { useEffect, useState } from 'react'
import { getMapStations } from '../services/stations'

const riskLabels = {
  SAFE: '안전',
  CAUTION: '주의',
  DANGER: '위험',
  UNKNOWN: '미산정',
}

export default function StationDataStatus() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getMapStations({ signal: controller.signal })
      .then((data) => {
        setStations(data)
        setError(null)
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  if (loading) {
    return <p role="status">정류소 데이터를 불러오는 중...</p>
  }

  if (error) {
    return <p role="alert">API 오류: {error}</p>
  }

  return (
    <section aria-label="정류소 데이터 확인">
      <h2>정류소 데이터</h2>
      <p>총 {stations.length.toLocaleString()}개 정류소</p>

      {stations.length === 0 ? (
        <p>조회된 정류소가 없습니다.</p>
      ) : (
        <ul>
          {stations.slice(0, 5).map((station) => (
            <li key={station.id}>
              <strong>{station.name}</strong>
              {' · '}
              {riskLabels[station.risk_level] ?? '알 수 없음'}
              {' · '}
              {station.average_daily_boarding == null
                ? '승차량 집계 없음'
                : `${station.average_daily_boarding.toLocaleString()}명`}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
