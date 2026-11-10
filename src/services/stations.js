
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '')

export async function getMapStations({
  bbox,
  signal,
} = {}) {
  const url = new URL(
    `${API_BASE_URL}/api/stations/map/`,
    window.location.origin
  )

  if (bbox) {
    if (
      !Array.isArray(bbox) ||
      bbox.length !== 4 ||
      !bbox.every(Number.isFinite)
    ) {
      throw new Error('bbox 형식이 올바르지 않습니다.')
    }

    url.searchParams.set('bbox', bbox.join(','))
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    let message = '정류소 정보를 불러오지 못했습니다.'

    try {
      const error = await response.json()
      message = error.message || message
    } catch {
      // 서버가 JSON 오류 응답을 반환하지 않은 경우
    }

    throw new Error(message)
  }

  const data = await response.json()

  if (!Array.isArray(data.results)) {
    throw new Error('정류소 응답 형식이 올바르지 않습니다.')
  }

  return data.results
}
