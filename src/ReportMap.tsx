import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Report } from './reports'
import { labels } from './reports'

export default function ReportMap({ reports, district }: { reports: Report[]; district: string }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!container.current) return
    const map = L.map(container.current).setView([39, 35], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map)
    const points: L.LatLngTuple[] = []
    for (const report of reports) {
      if (report.lat === undefined || report.lng === undefined) continue
      const point: L.LatLngTuple = [report.lat, report.lng]; points.push(point)
      const content = document.createElement('span')
      content.textContent = `${report.title} · ${labels[report.status]}`
      L.circleMarker(point, { radius: 9, color: '#315b35', fillColor: '#c5ed99', fillOpacity: 1 }).addTo(map).bindPopup(content)
    }
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 15 })
    return () => { map.remove() }
  }, [reports])
  return <section className="mapArea" aria-labelledby="map-heading"><h2 id="map-heading">{district} · Bildirim haritası</h2><div ref={container} className="reportMap" aria-label="Bildirim konumları" />{!reports.some(r => r.lat !== undefined && r.lng !== undefined) && <p className="muted">Konumu bulunan bildirim yok.</p>}</section>
}
