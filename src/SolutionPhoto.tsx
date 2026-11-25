import type { Report } from './reports'

export default function SolutionPhoto({ report, editable, disabled, attach, remove }: {
  report: Report
  editable: boolean
  disabled: boolean
  attach: (files: File[]) => Promise<void>
  remove: () => Promise<void>
}) {
  if (!report.solutionPhoto && !editable) return null
  return <section className="solutionPhoto" aria-label="Çözüm fotoğrafı">
    {report.solutionPhoto && <figure><img src={report.solutionPhoto} alt="Müdahale sonrası alan"/><figcaption>Çözüm fotoğrafı · 1 / 1</figcaption></figure>}
    {editable && <div className="photoControls"><label>{report.solutionPhoto ? 'Fotoğrafı değiştir' : 'Çözüm fotoğrafı ekle'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => {
      const files = Array.from(event.currentTarget.files ?? [])
      // Aynı dosyanın düzeltildikten sonra yeniden seçilebilmesini sağlar.
      event.currentTarget.value = ''
      void attach(files)
    }}/></label>{report.solutionPhoto && <button className="outline" disabled={disabled} onClick={() => void remove()}>Fotoğrafı kaldır</button>}</div>}
    {editable && <p className="muted">En fazla 1 fotoğraf · JPG, PNG veya WebP · En fazla 1 MB. Yeni fotoğraf mevcut fotoğrafın yerine geçer.</p>}
    {editable && report.status === 'resolved' && <p className="muted">Fotoğraf kaldırılırsa bildirim tekrar “Çözülmekte” durumuna alınır.</p>}
  </section>
}
