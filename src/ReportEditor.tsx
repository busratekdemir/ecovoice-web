import type { FormEvent } from 'react'
import type { Priority, Report, Status } from './reports'
import { labels } from './reports'

export default function ReportEditor({ report, disabled, save }: { report: Report; disabled: boolean; save: (id: string, changes: { status?: Status; priority: Priority }) => Promise<void> }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const status = data.get('status') as Status
    void save(report.id, { ...(status !== report.status ? { status } : {}), priority: data.get('priority') as Priority })
  }
  return <details className="reportEditor"><summary>Durumu / önceliği düzenle</summary><form onSubmit={submit}>
    <p className="muted">Yanlış işaretlenen bildirimi tekrar incelemeye alabilir veya durumunu düzeltebilirsiniz.</p>
    <div className="editorFields"><label>Bildirim durumu<select name="status" defaultValue={report.status} disabled={disabled}>{(Object.keys(labels) as Status[]).map(status => <option key={status} value={status} disabled={status === 'resolved' && !report.solutionPhoto && report.status !== 'resolved'}>{labels[status]}</option>)}</select></label>
    <label>Öncelik<select name="priority" defaultValue={report.priority} disabled={disabled}>{['Düşük', 'Orta', 'Yüksek'].map(priority => <option key={priority}>{priority}</option>)}</select></label><button className="primary" disabled={disabled}>Değişiklikleri kaydet</button></div>
    {!report.solutionPhoto && <p className="muted">Çözüldü durumuna geçmek için belediyenin çözüm fotoğrafı eklemesi gerekir.</p>}
  </form></details>
}
