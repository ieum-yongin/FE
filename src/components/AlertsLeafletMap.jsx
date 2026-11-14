import { useEffect, useMemo, useRef, useState } from 'react'
import { YONGIN_CENTER, boundsFor, clearMarkers, coords, createHtmlMarker, getGeoPosition, useNaverMaps } from './naverMapCore'

function alertHtml(type, selected) {
  const increase = type === 'increase'
  const cls = increase ? 'increase' : type === 'decrease' ? 'decrease' : 'unknown'
  const symbol = increase ? '↑' : type === 'decrease' ? '↓' : '!'
  return `<span class="alerts-leaflet-pin ${cls}${selected ? ' is-selected' : ''}">${symbol}</span>`
}

/** Compatibility name retained for existing AlertsPage imports. Uses NAVER Maps, not Leaflet. */
export default function AlertsLeafletMap({ alerts = [], selected, onSelect }) {
  const { maps, error } = useNaverMaps()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const clickRef = useRef(onSelect)
  clickRef.current = onSelect
  const locatedAlerts = useMemo(() => alerts.filter(a => getGeoPosition(a)), [alerts])
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (!maps || !containerRef.current) return undefined
    const map = new maps.Map(containerRef.current, {
      center: coords(maps, YONGIN_CENTER), zoom: 11, minZoom: 7, maxZoom: 18,
      zoomControl: true, scrollWheel: true,
    })
    mapRef.current = map
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.refresh()) : null
    observer?.observe(containerRef.current)
    setInitialised(true)
    return () => {
      observer?.disconnect()
      clearMarkers(maps, markersRef.current)
      markersRef.current = []
      mapRef.current = null
      map.destroy?.()
    }
  }, [maps])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !initialised) return
    clearMarkers(maps, markersRef.current)
    markersRef.current = locatedAlerts.map(alert => createHtmlMarker(maps, map, {
      position: getGeoPosition(alert), html: alertHtml(alert.type, String(selected?.id) === String(alert.id)),
      size: [46, 46], anchor: [23, 23], zIndex: String(selected?.id) === String(alert.id) ? 200 : 20,
      title: alert.stationName || '정류소', onClick: () => clickRef.current?.(alert.id),
    }))
  }, [maps, initialised, locatedAlerts, selected])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !initialised) return
    const positions = locatedAlerts.map(getGeoPosition).filter(Boolean)
    const bounds = boundsFor(maps, positions)
    if (positions.length > 1 && bounds) map.fitBounds(bounds)
    else if (positions.length === 1) map.panTo(coords(maps, positions[0]))
  }, [maps, initialised, locatedAlerts])

  useEffect(() => {
    const map = mapRef.current
    const position = selected && getGeoPosition(selected)
    if (!maps || !map || !position || !initialised) return
    map.panTo(coords(maps, position))
    if (map.getZoom() < 15) map.setZoom(15)
  }, [maps, initialised, selected])

  return <div className="alerts-real-map" aria-label="용인시 이용 급변 알림 네이버 지도">
    <div ref={containerRef} className="alerts-leaflet-map ieum-naver-map" />
    {error && <div className="ieum-naver-map-error" role="alert">{error}</div>}
    {!maps && !error && <div className="ieum-naver-map-error" role="status">네이버 지도를 불러오는 중입니다.</div>}
  </div>
}
