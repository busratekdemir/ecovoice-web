import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import { db } from './firebase'

export type Status = 'pending' | 'rejected' | 'new' | 'in_progress' | 'resolved'
export type Priority = 'Düşük' | 'Orta' | 'Yüksek'
export type Report = { id: string; title: string; description: string; district: string; category: string; priority: Priority; status: Status; lat?: number; lng?: number; photo?: string; solutionPhoto?: string }
export const labels: Record<Status, string> = { pending: 'İnceleme bekliyor', rejected: 'Reddedildi', new: 'Yeni', in_progress: 'Müdahalede', resolved: 'Çözüldü' }
// Android şeması farklıysa yalnızca bu eşlemeleri değiştirin.
export const reportSchema = {
  collection: import.meta.env.VITE_REPORTS_COLLECTION || 'reports',
  fields: { title: 'title', description: 'description', district: 'district', category: 'category', priority: 'priority', status: 'status', lat: 'lat', lng: 'lng', photo: 'photo', solutionPhoto: 'solutionPhoto' },
  statuses: { pending: 'pending', rejected: 'rejected', new: 'new', in_progress: 'in_progress', resolved: 'resolved' } as Record<Status, string>,
}
export const userDistrictField = import.meta.env.VITE_USER_DISTRICT_FIELD || 'ilce'
function safeImage(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined } catch { return }
}
export function decodeReport(id: string, data: DocumentData): Report {
  const f = reportSchema.fields
  const status = (Object.keys(reportSchema.statuses) as Status[]).find(key => reportSchema.statuses[key] === data[f.status])
  if (!status) throw new Error(`${id}: Tanınmayan bildirim durumu. src/reports.ts alan eşlemesini kontrol edin.`)
  const coordinate = (value: unknown, max: number) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max ? value : undefined
  return { id, title: String(data[f.title] ?? 'Başlıksız bildirim'), description: String(data[f.description] ?? ''), district: String(data[f.district] ?? ''), category: String(data[f.category] ?? ''), priority: ['Düşük', 'Orta', 'Yüksek'].includes(data[f.priority]) ? data[f.priority] : 'Orta', status, lat: coordinate(data[f.lat], 90), lng: coordinate(data[f.lng], 180), photo: safeImage(data[f.photo]), solutionPhoto: safeImage(data[f.solutionPhoto]) }
}
export function subscribeReports(role: 'admin' | 'belediye', district: string, receive: (reports: Report[], newCount: number) => void, fail: (error: unknown) => void) {
  const base = collection(db, reportSchema.collection)
  const source = role === 'admin' ? base : query(base, where(reportSchema.fields.district, '==', district))
  let initialized = false
  let previous = new Set<string>()
  return onSnapshot(source, { includeMetadataChanges: true }, snapshot => {
    // İlk sunucu sonucu başlangıçtır; önbellek yeni bildirim uyarısı üretmez.
    if (snapshot.metadata.fromCache) return
    try {
      const reports = snapshot.docs.map(item => decodeReport(item.id, item.data()))
      const pending = new Set(reports.filter(item => item.status === 'pending').map(item => item.id))
      const newCount = initialized ? [...pending].filter(id => !previous.has(id)).length : 0
      previous = pending; initialized = true
      receive(reports, newCount)
    } catch (error) { fail(error) }
  }, fail)
}
export async function saveReport(id: string, data: Partial<Pick<Report, 'status' | 'priority' | 'solutionPhoto'>>) {
  const changes: DocumentData = { updatedAt: serverTimestamp() }
  if (data.status) {
    changes[reportSchema.fields.status] = reportSchema.statuses[data.status]
    const field = { new: 'approvedAt', rejected: 'rejectedAt', in_progress: 'startedAt', resolved: 'resolvedAt', pending: 'submittedAt' }[data.status]
    changes[field] = serverTimestamp()
  }
  if (data.priority) changes[reportSchema.fields.priority] = data.priority
  if (data.solutionPhoto) changes[reportSchema.fields.solutionPhoto] = data.solutionPhoto
  await updateDoc(doc(db, reportSchema.collection, id), changes)
}
export async function uploadSolution(file: File): Promise<string> {
  const key = import.meta.env.VITE_IMGBB_API_KEY
  if (!key) throw new Error('Fotoğraf yüklemek için VITE_IMGBB_API_KEY yapılandırılmalı.')
  const body = new FormData(); body.set('image', file); body.set('key', key)
  const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body, signal: AbortSignal.timeout(60000) })
  const result = await response.json()
  const url = safeImage(result.data?.url)
  if (!response.ok || !result.success || !url) throw new Error('ImgBB fotoğrafı yükleyemedi. Tekrar deneyin.')
  return url
}
