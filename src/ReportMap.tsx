import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import boundaries from './data/izmir-manisa.geojson.json'
import type { Report, Status } from './reports'
import { labels } from './reports'

const colors: Partial<Record<Status, string>> = { new: '#dc2626', in_progress: '#eab308', resolved: '#16a34a' }
const region: L.LatLngBoundsExpression = [[38.12, 26.65], [39.05, 28.1]]

export default function ReportMap({ reports, district }: { reports: Report[]; district: string }) {
  const container = useRef<HTMLDivElement>(null)
  const instance = useRef<L.Map | null>(null)
  const markers = useRef<L.FeatureGroup | null>(null)
  useEffect(() => {
    if (!container.current) return
    const map = L.map(container.current, { zoomSnap: 0.5, minZoom: 5, maxZoom: 19 }).fitBounds(region, { padding: [20, 20] })
    instance.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map)
    const geometry = boundaries as FeatureCollection
    // Beyaz dış çizgi hem açık hem koyu zemin üzerinde sınırı görünür tutar.
    L.geoJSON(geometry, { style: { color: '#ffffff', weight: 7, opacity: 0.95, fill: false }, interactive: false }).addTo(map)
    L.geoJSON(geometry, {
      style: { color: '#243d64', weight: 3, opacity: 1, fillColor: '#6b91b3', fillOpacity: 0.035 },
      onEachFeature: (feature, layer) => layer.bindTooltip(String(feature.properties?.shapeName ?? ''), { sticky: true }),
    }).addTo(map)
    map.attributionControl.addAttribution('<a href="https://www.geoboundaries.org/">geoBoundaries</a> · İl sınırları (2021) · <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a>')
    markers.current = L.featureGroup().addTo(map)
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container.current)
    return () => { observer.disconnect(); map.remove(); instance.current = null; markers.current = null }
  }, [])
  useEffect(() => {
    const group = markers.current
    if (!group) return
    group.clearLayers()
    for (const report of reports) {
      const color = colors[report.status]
      if (!color || report.lat === undefined || report.lng === undefined) continue
      const content = document.createElement('div')
      const title = document.createElement('strong'); title.textContent = report.title
      const detail = document.createElement('p'); detail.textContent = `${report.district} · ${labels[report.status]}`
      content.append(title, detail)
      const marker = L.circleMarker([report.lat, report.lng], { radius: 9, color: '#ffffff', weight: 2.5, fillColor: color, fillOpacity: 1, className: `report-marker marker-${report.status}` })
      marker.bindPopup(content).bindTooltip(`${report.title} · ${labels[report.status]}`).addTo(group)
      const element = marker.getElement()
      element?.setAttribute('role', 'button'); element?.setAttribute('tabindex', '0')
      element?.setAttribute('aria-label', `${report.title} · ${labels[report.status]}`)
      element?.addEventListener('keydown', event => { if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); marker.openPopup() } })
    }
  }, [reports])
  const located = reports.filter(r => colors[r.status] && r.lat !== undefined && r.lng !== undefined)
  const missing = reports.filter(r => colors[r.status] && (r.lat === undefined || r.lng === undefined)).length
  return <section className="mapArea" aria-labelledby="map-heading">
    <div className="mapHeading"><div><h2 id="map-heading">{district || 'İzmir–Manisa'} · Bildirim haritası</h2><p className="muted">Onaylanan bildirimlerin güncel müdahale durumu</p></div><div className="mapTools"><button className="outline" onClick={() => instance.current?.fitBounds(region, { padding: [20, 20] })}>İzmir–Manisa’ya dön</button><button className="outline" disabled={!located.length} onClick={() => { const bounds = markers.current?.getBounds(); if (bounds?.isValid()) instance.current?.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 }) }}>Tüm noktaları göster</button></div></div>
    <ul className="mapLegend" aria-label="Harita renk açıklamaları"><li><i style={{ background: colors.new }} />Çözülmemiş</li><li><i style={{ background: colors.in_progress }} />Çözülmekte</li><li><i style={{ background: colors.resolved }} />Çözülmüş</li></ul>
    <div ref={container} className="reportMap" aria-label="İzmir ve Manisa bildirim konumları" />
    {!located.length && <p className="muted">Haritada gösterilecek onaylanmış ve konumu bulunan bildirim yok.</p>}
    {missing > 0 && <p className="muted">{missing} bildirim konum bilgisi eksik olduğu için yalnızca listede gösteriliyor.</p>}
  </section>
}
