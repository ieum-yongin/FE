import { useEffect, useState } from 'react'

const SDK_URL = 'https://oapi.map.naver.com/openapi/v3/maps.js'
let sdkPromise = null

/** Load the official Naver Maps JavaScript SDK once per browser page. */
export function loadNaverMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('지도는 브라우저에서만 표시할 수 있습니다.'))
  if (window.naver?.maps?.Map) return Promise.resolve(window.naver.maps)
  const key = import.meta.env.VITE_NAVER_MAP_CLIENT_ID?.trim()
  if (!key) return Promise.reject(new Error('VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.'))
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    let done = false
    const priorFailure = window.navermap_authFailure
    const timeout = window.setTimeout(() => finish(new Error('네이버 지도 SDK 연결 시간이 초과됐습니다.')), 15000)
    const script = document.createElement('script')
    script.src = `${SDK_URL}?ncpKeyId=${encodeURIComponent(key)}`
    script.async = true
    script.dataset.ieumNaverMaps = 'true'
    function finish(error) {
      if (done) return
      done = true
      window.clearTimeout(timeout)
      window.navermap_authFailure = priorFailure
      if (error) {
        script.remove()
        sdkPromise = null
        reject(error)
      } else resolve(window.naver.maps)
    }
    window.navermap_authFailure = () => finish(new Error('네이버 지도 인증에 실패했습니다. Client ID와 허용된 웹 서비스 URL을 확인해 주세요.'))
    script.onload = () => window.naver?.maps?.Map
      ? finish(null)
      : finish(new Error('네이버 지도 SDK 초기화에 실패했습니다.'))
    script.onerror = () => finish(new Error('네이버 지도 SDK를 다운로드하지 못했습니다.'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

export function useNaverMaps() {
  const [state, setState] = useState({ maps: null, error: '' })
  useEffect(() => {
    let alive = true
    loadNaverMaps().then(maps => {
      if (alive) setState({ maps, error: '' })
    }).catch(error => {
      if (alive) setState({ maps: null, error: error.message })
    })
    return () => { alive = false }
  }, [])
  return state
}

export const YONGIN_CENTER = [37.2411, 127.1776]

export function getGeoPosition(item) {
  const rawLat = item.latitude ?? item.lat
  const rawLng = item.longitude ?? item.lng ?? item.lon
  if (rawLat == null || rawLng == null || rawLat === '' || rawLng === '') return null
  const lat = Number(rawLat)
  const lng = Number(rawLng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}

export function coords(maps, pos) {
  return new maps.LatLng(pos[0], pos[1])
}

export function boundsFor(maps, positions) {
  if (!positions.length) return null
  const lats = positions.map(p => p[0])
  const lngs = positions.map(p => p[1])
  return new maps.LatLngBounds(
    new maps.LatLng(Math.min(...lats), Math.min(...lngs)),
    new maps.LatLng(Math.max(...lats), Math.max(...lngs))
  )
}

export function pointInBounds(bounds, pos) {
  try { return !bounds || bounds.hasLatLng(new window.naver.maps.LatLng(pos[0], pos[1])) } catch { return true }
}

// World-mercator screen pixels, used only for visual grouping (not geographic positions).
export function mercatorPixel(pos, zoom) {
  const sin = Math.sin(pos[0] * Math.PI / 180)
  const x = (pos[1] + 180) / 360
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)
  const scale = 256 * 2 ** zoom
  return [x * scale, y * scale]
}

export function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export function createHtmlMarker(maps, map, { position, html, size = [60, 85], anchor = [size[0] / 2, 29], zIndex = 1, onClick, title }) {
  const marker = new maps.Marker({
    position: coords(maps, position), map, zIndex,
    title: title || '',
    icon: {
      content: html,
      size: new maps.Size(size[0], size[1]),
      anchor: new maps.Point(anchor[0], anchor[1]),
    },
  })
  if (onClick) {
    const listener = maps.Event.addListener(marker, 'click', onClick)
    marker.__ieumListener = listener
  }
  return marker
}

export function clearMarkers(maps, markers) {
  markers.forEach(marker => {
    if (marker.__ieumListener) maps.Event.removeListener(marker.__ieumListener)
    marker.setMap(null)
  })
}
