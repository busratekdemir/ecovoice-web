import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDocFromServer } from 'firebase/firestore'
import { auth, db } from './firebase'

type Status = 'pending' | 'rejected' | 'new' | 'in_progress' | 'resolved'
type Priority = 'Düşük' | 'Orta' | 'Yüksek'
type Report = { id:string; title:string; description:string; district:string; category:string; priority:Priority; status:Status; lat:number; lng:number; photo?:string; solutionPhoto?:string; approvedAt?:string; startedAt?:string; resolvedAt?:string }
const reportsKey = 'ecovoice-web-demo-v1'
const labels:Record<Status,string> = {pending:'İnceleme bekliyor', rejected:'Reddedildi', new:'Yeni', in_progress:'Müdahalede', resolved:'Çözüldü'}
const initial:Report[] = [
  {id:'EV-001',title:'Dere kenarında atık birikmiş',description:'Dere kenarında plastik şişeler ve çöp poşetleri var.',district:'Bornova',category:'Atık',priority:'Orta',status:'pending',lat:38.462,lng:27.219},
  {id:'EV-002',title:'Kaldırım kenarında su sızıntısı',description:'Kaldırımın kenarından sürekli su akıyor.',district:'Bornova',category:'Su sızıntısı',priority:'Yüksek',status:'pending',lat:38.466,lng:27.217},
]
function stored<T,>(key:string, fallback:T):T {
  const value = localStorage.getItem(key)
  return value ? JSON.parse(value) as T : fallback
}
function loadReports(){
  try {const list=stored(reportsKey,initial); return Array.isArray(list)?list:initial}
  catch{return initial}
}
function authMessage(error:unknown){
  const code=error instanceof FirebaseError ? error.code : ''
  switch(code){
    case 'auth/invalid-credential': case 'auth/user-not-found': case 'auth/wrong-password': return 'E-posta veya parola hatalı.'
    case 'auth/email-already-in-use': return 'Bu e-posta adresi zaten kayıtlı.'
    case 'auth/invalid-email': return 'Geçerli bir e-posta adresi girin.'
    case 'auth/weak-password': case 'auth/password-does-not-meet-requirements': return 'Parola güvenlik koşullarını karşılamıyor. Daha güçlü bir parola seçin.'
    case 'auth/too-many-requests': return 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.'
    case 'auth/network-request-failed': return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'
    case 'auth/user-disabled': return 'Bu hesap devre dışı bırakılmış. Yöneticiyle iletişime geçin.'
    case 'auth/operation-not-allowed': return 'E-posta ve parola ile giriş Firebase projesinde etkin değil.'
    default: return 'Hesap işlemi tamamlanamadı. Lütfen tekrar deneyin.'
  }
}
function Forest(){
  return <div className="forest" aria-hidden="true">
    <div className="sun"/><div className="ridge far"/><div className="ridge near"/>
    {[0,1,2].map(row=><div className={'trees row'+row} key={row}>
      {Array.from({length:38},(_,i)=>{
        const n=(i*41+row*23)%67
        return <i key={i} style={{left:(i*2.86-3)+'%',height:(26+n*(row+1)*.68)+'%',width:(4+row*1.3+n*.025)+'%',bottom:(7*Math.sin(i*.29+row))+'%'}}/>
      })}
    </div>)}
  </div>
}
function MunicipalityMapArea() {
  return (
    <section className="mapArea" aria-labelledby="map-heading">
      <h2 id="map-heading">Bildirim haritası</h2>
      {/* Harita hazır olduğunda aşağıdaki yer tutucuyu <ReportMap reports={municipal} /> ile değiştirin ve municipal listesini bu bileşene prop olarak geçin. */}
      <div className="mapPlaceholder"><span>Bornova · Harita hazırlanıyor</span></div>
    </section>
  )
}
function Brand(){return <div className="brand"><span className="mark" aria-hidden="true">▲</span>EcoVoice</div>}

export default function App(){
  const [session,setSession]=useState<'demo'|'firebase'|null>(null)
  const [user,setUser]=useState<User|null>(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [register,setRegister]=useState(false)
  const [panel,setPanel]=useState<'admin'|'municipality'>('admin')
  const [reports,setReports]=useState(loadReports)
  const [notice,setNotice]=useState('')
  const [storageError,setStorageError]=useState('')
  const [busy,setBusy]=useState(false)
  const [filter,setFilter]=useState('all')
  useEffect(()=>{
    try{localStorage.setItem(reportsKey,JSON.stringify(reports));setStorageError('')}
    catch{setStorageError('Bu tarayıcı değişiklikleri saklayamadı. Daha küçük bir fotoğraf deneyin.')}
  },[reports])
  useEffect(()=>{
    let active=true
    let revision=0
    const unsubscribe=onAuthStateChanged(auth,async currentUser=>{
      const request=++revision
      setUser(currentUser);setSession(null)
      if(!currentUser){setAuthLoading(false);return}
      setAuthLoading(true);setRegister(false);setNotice('')
      try{
        const profile=await getDocFromServer(doc(db,'users',currentUser.uid))
        if(!active || request!==revision)return
        const role=profile.data()?.role
        if(role==='admin' || role==='belediye'){
          setPanel(role==='admin'?'admin':'municipality');setFilter('all');setSession('firebase')
        }else{
          setNotice('Hesabınızda panel yetkisi bulunmuyor. Bir yöneticinin users/'+currentUser.uid+' belgesine admin veya belediye rolünü atamasını bekleyin.')
        }
      }catch{
        if(active && request===revision)setNotice('Hesabınıza giriş yapıldı ancak panel rolünüz Firestore üzerinden okunamadı. Bağlantınızı ve erişim izinlerini kontrol edip sayfayı yenileyin.')
      }finally{
        if(active && request===revision)setAuthLoading(false)
      }
    },()=>{
      if(active){setAuthLoading(false);setNotice('Oturum kontrol edilemedi. Sayfayı yenileyip tekrar deneyin.')}
    })
    return ()=>{active=false;revision++;unsubscribe()}
  },[])
  async function logout(){
    setBusy(true)
    try{await signOut(auth);setUser(null);setSession(null);setRegister(false);setNotice('')}
    catch(error){setNotice(authMessage(error))}
    finally{setBusy(false)}
  }
  function openPanel(next:typeof panel){setPanel(next);setFilter('all');setNotice('')}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    const email=String(form.get('email')).trim().toLowerCase()
    const password=String(form.get('password'))
    if(busy || authLoading)return
    if(register && password!==form.get('again')){setNotice('Parolalar eşleşmiyor.');return}
    setBusy(true);setNotice('')
    try{
      if(register){
        await createUserWithEmailAndPassword(auth,email,password)
        // Kayıt panel rolü oluşturmaz; yetki yalnızca yönetici tarafından atanır.
        setRegister(false)
      }else{
        await signInWithEmailAndPassword(auth,email,password)
      }
    }catch(error){setNotice(authMessage(error))}
    finally{setBusy(false)}
  }

  function patch(id:string,data:Partial<Report>){setReports(old=>old.map(r=>r.id===id?{...r,...data}:r))}
  function transition(r:Report,status:Status){
    const now=new Date().toISOString()
    const dates=status==='new'?{approvedAt:now}:status==='in_progress'?{startedAt:now}:status==='resolved'?{resolvedAt:now}:{}
    patch(r.id,{status,...dates})
    setNotice(status==='new'?r.id+' onaylandı ve Bornova Belediyesi iş listesine eklendi.':r.id+' · '+labels[status])
  }
  async function attach(r:Report,file?:File){
    if(!file)return
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){setNotice('1 MB altında JPG, PNG veya WebP dosyası seç.');return}
    setBusy(true)
    const reader=new FileReader()
    reader.onload=()=>{patch(r.id,{solutionPhoto:String(reader.result)});setNotice('Çözüm fotoğrafı eklendi.')}
    reader.onerror=()=>setNotice('Fotoğraf okunamadı.')
    reader.onloadend=()=>setBusy(false)
    reader.readAsDataURL(file)
  }
  const admin=panel==='admin'
  const pending=reports.filter(r=>r.status==='pending')
  const municipal=reports.filter(r=>r.district==='Bornova'&&['new','in_progress','resolved'].includes(r.status))
  const list=(admin?pending:municipal).filter(r=>filter==='all'||r.status===filter)
  return <div className="ev"><style>{styles}</style>
    <header className="top"><Brand/><span className="wordmark">ÇEVRE BİLDİRİM SİSTEMİ</span>{(session||user)&&<button className="textBtn" disabled={busy||authLoading} onClick={()=>void logout()}>Çıkış yap ↗</button>}</header>
    {authLoading?<main className="formArea"><p role="status">Oturum ve panel yetkisi kontrol ediliyor…</p></main>:!session?<main className="auth">
      <aside className="land"><div className="landText"><span className="eyebrow">İZMİR / BORNOVA</span><h2>Çevre bildirim<br/><em>merkezi.</em></h2><p>Çevre sorunlarını inceleyin, müdahaleleri ve sonuçlarını takip edin.</p></div><Forest/></aside>
      <section className="formArea"><div className="formBox">
        <div className="tabs">{[false,true].map(v=><button key={String(v)} aria-pressed={register===v} disabled={busy} onClick={()=>{setRegister(v);setNotice('')}}>{v?'Kayıt ol':'Giriş yap'}</button>)}</div>
        <h1>{register?'Hesap oluştur':'Panele giriş'}</h1>
        <p className="muted">{register?'Hesabınızı oluşturun. Panel erişimi için yönetici tarafından rol atanması gerekir.':'E-posta ve parolanızla veya demo moduyla devam edin.'}</p>
        <form key={String(register)} onSubmit={submit}>
          <label>E-posta<input type="email" name="email" autoComplete="email" placeholder="ornek@belediye.tr" required/></label>
          <label>Parola<input type="password" name="password" autoComplete={register?'new-password':'current-password'} minLength={register?8:1} placeholder={register?'En az 8 karakter':'Parolanı gir'} required/></label>
          {register&&<label>Parolayı tekrarla<input type="password" name="again" autoComplete="new-password" required/></label>}
          <button className="primary wide" disabled={busy}>{busy?'İşlem yapılıyor…':register?'Kayıt ol':'Giriş yap'} <b>→</b></button>
        </form>
        {!register && (
          <fieldset className="demoEntry">
            <legend>Demo ile giriş yap</legend>
            <button className="outline" disabled={busy} onClick={() => { openPanel('municipality'); setSession('demo') }}>Belediye demosu ↗</button>
            <button className="outline" disabled={busy} onClick={() => { openPanel('admin'); setSession('demo') }}>Admin demosu ↗</button>
          </fieldset>
        )}
        {notice&&<p role="status" className="notice">{notice}</p>}
      </div></section>
    </main>:<main className="dashboard">
      <div className="banner"><div><span className="eyebrow">BORNOVA / {admin ? 'ADMİN PANELİ' : 'BELEDİYE PANELİ'}</span><h1>{admin?'Bildirim inceleme':'Belediye iş listesi'}</h1></div><Forest/></div>
      <div className="stats">{[[pending.length,'Onay bekleyen'],[municipal.length,'Belediyeye iletilen'],[municipal.filter(r=>r.status==='resolved').length,'Çözülen']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      {!admin && <MunicipalityMapArea />}
      <div className="listHead"><h2>{admin?'Onay bekleyenler':'Belediye bildirimleri'}</h2>{!admin&&<select aria-label="Durum filtresi" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tüm durumlar</option>{(['new','in_progress','resolved'] as const).map(s=><option key={s} value={s}>{labels[s]}</option>)}</select>}</div>
      {notice&&<p className="notice" role="status">{notice}</p>}{storageError&&<p role="alert">{storageError}</p>}
      {!list.length&&<p className="card muted">{admin?'İncelenecek bildirim kalmadı.':municipal.length?'Bu durumda bildirim yok.':'Onaylanan Bornova bildirimleri burada görünecek.'}</p>}
      {list.map(r=><article className="card" key={r.id}>
        <div className="meta"><span>{r.id} · {r.category}</span><span className={'status '+r.status}>{labels[r.status]}</span></div>
        <h3>{r.title}</h3><p>{r.description}</p><p className="muted">{r.district}, İzmir · {r.lat.toFixed(3)}° N / {r.lng.toFixed(3)}° E</p>
        {r.photo&&<img src={r.photo} alt="Bildirilen çevre sorunu"/>}
        <div className="actions">{admin?<><label>Öncelik<select value={r.priority} onChange={e=>patch(r.id,{priority:e.target.value as Priority})}>{['Düşük','Orta','Yüksek'].map(p=><option key={p}>{p}</option>)}</select></label><button className="primary" onClick={()=>transition(r,'new')}>Onayla</button><button className="outline" onClick={()=>transition(r,'rejected')}>Reddet</button></>:<><span>Öncelik · {r.priority}</span>{r.status==='new'&&<button className="primary" onClick={()=>transition(r,'in_progress')}>Müdahaleye başla</button>}{r.status==='in_progress'&&<><label>Çözüm fotoğrafı · en fazla 1 MB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void attach(r,e.target.files?.[0])}/></label><button className="primary" disabled={!r.solutionPhoto||busy} onClick={()=>transition(r,'resolved')}>Çözüldü olarak işaretle</button></>}</>}</div>
        {r.solutionPhoto&&<figure><img src={r.solutionPhoto} alt="Müdahale sonrası alan"/><figcaption>Çözüm fotoğrafı</figcaption></figure>}
      </article>)}
    </main>}
  </div>
}

const styles = `
.ev .demoEntry{display:grid;grid-template-columns:1fr 1fr;gap:10px;border:0;border-top:1px solid var(--line);margin:22px 0 0;padding:12px 0 0;min-width:0}
.demoEntry legend{padding:0 9px 0 0;color:#b9cbba;font-size:14px}
.mapArea{margin-top:24px;border:1px solid var(--line);background:#15251d;padding:16px}
.mapArea h2{margin:0 0 12px;font-size:22px}
.mapPlaceholder{display:grid;place-items:center;min-height:clamp(200px,30vw,320px);background-color:#162b22;background-image:linear-gradient(#263b30 1px,transparent 1px),linear-gradient(90deg,#263b30 1px,transparent 1px);background-size:28px 28px}
.mapPlaceholder span{padding:8px 14px;background:#15251d;color:#cbd9ce;font-size:14px}
@media(max-width:440px){.ev .demoEntry{grid-template-columns:1fr}}

:root{color-scheme:dark;background:#0b1713}*{box-sizing:border-box}body{margin:0;display:block;min-width:300px}#root{width:100%;max-width:none;margin:0;padding:0;text-align:left}.ev{--line:#334a40;--lime:#c5ed99;min-height:100svh;color:#edf3e7;background:#0d1915;font:16px/1.5 "DM Sans",Arial,sans-serif}.ev :is(button,input,select){font:inherit;border-radius:0}.ev button{cursor:pointer}.ev :focus-visible{outline:3px solid #ddfd9f;outline-offset:3px}.top{min-height:76px;border-bottom:1px solid var(--line);padding:16px clamp(20px,5vw,86px);display:flex;align-items:center;gap:24px}.brand{font-weight:750;font-size:26px;letter-spacing:-1.3px;display:flex;align-items:center;gap:10px}.mark{font-size:19px;display:grid;place-items:center;background:var(--lime);width:32px;height:32px;color:#143824}.wordmark,.eyebrow,.meta,.status,.stats span,.ev figcaption{font-family:"Courier New",monospace;font-size:12px;letter-spacing:.055em}.wordmark{padding-left:24px;border-left:1px solid var(--line);color:#b0c1b4}.textBtn{margin-left:auto;background:none;color:var(--lime);border:0;padding:8px}.auth{display:grid;grid-template-columns:1.07fr 1fr;min-height:calc(100svh - 76px)}.land,.banner{position:relative;isolation:isolate;overflow:hidden;background:#1d3b30}.land{border-right:1px solid var(--line)}.landText{position:relative;z-index:2;padding:clamp(36px,5.5vw,88px);max-width:650px}.eyebrow{color:#c9e6b2}.land h2{font-size:clamp(48px,6.5vw,110px);line-height:.96;margin:25px 0 20px;letter-spacing:-.065em;font-weight:600}.land em{font-family:Georgia,serif;font-weight:400;color:var(--lime)}.land p{color:#c3d4c9;max-width:320px}.forest{position:absolute;inset:0;overflow:hidden;z-index:-1;background:linear-gradient(155deg,#18342c,#335746)}.sun{position:absolute;background:#aec17e;opacity:.55;width:13%;aspect-ratio:1;right:15%;bottom:35%;clip-path:circle(49%)}.ridge{position:absolute;inset:38% -1% 0;clip-path:polygon(0 64%,17% 46%,26% 51%,48% 24%,55% 30%,73% 12%,100% 32%,100% 100%,0 100%);background:#50735d}.near{inset:49% -2% 0;transform:scaleX(-1);background:#335a46}.trees{position:absolute;left:-2%;right:-2%;height:20%;background:linear-gradient(transparent 90%,var(--tree) 90%)}.trees i{position:absolute;background:var(--tree);clip-path:polygon(50% 0,71% 31%,62% 29%,84% 56%,72% 54%,100% 86%,55% 82%,55% 100%,45% 100%,45% 82%,0 86%,28% 54%,16% 56%,38% 29%,29% 31%)}.row0{--tree:#2b4e3d;bottom:13%}.row1{--tree:#213f30;bottom:6%;height:21%}.row2{--tree:#142e23;bottom:0;height:21%}.formArea{display:grid;place-items:center;padding:44px clamp(22px,5vw,85px)}.formBox{width:100%;max-width:410px}.ev h1,.ev h2,.ev h3{color:inherit}.ev h1{font-size:clamp(34px,4vw,56px);letter-spacing:-.055em;line-height:1.05;margin:34px 0 12px}.muted,.card p,.ev figcaption{color:#acc0b3}.formBox>.muted{margin:0 0 28px}.tabs{display:flex;border-bottom:1px solid var(--line)}.tabs button{color:#aebfb2;border:0;border-bottom:2px solid transparent;background:none;padding:12px 17px}.tabs button[aria-pressed=true]{color:var(--lime);border-color:var(--lime)}.ev label{display:grid;gap:6px;font-size:14px;font-weight:600}.ev input,.ev select{min-width:0;max-width:100%;width:100%;padding:12px;background:#15251e;color:#eef4eb;border:1px solid #4c6356}.ev input::placeholder{color:#9cafa2}.ev form{display:grid;gap:17px}.ev .primary,.ev .outline{padding:11px 18px;font-weight:650;border:1px solid var(--lime)}.ev .primary{background:var(--lime);color:#142318}.ev .outline{background:transparent;border-color:#56705e;color:#d0e4c7}.ev button:hover{filter:brightness(1.1)}.ev button:disabled{opacity:.45;cursor:default}.wide{display:flex;justify-content:space-between;width:100%;align-items:center}.formBox>.outline{margin-top:12px}.notice{border-left:3px solid var(--lime);background:#1e3528;padding:12px 16px}.dashboard{max-width:1110px;margin:auto;padding:22px clamp(16px,4vw,48px) 64px}.banner{margin:20px 0 0;padding:32px;min-height:170px}.banner h1{margin:10px 0}.banner .forest{left:38%;mask-image:linear-gradient(90deg,transparent,#000 25%)}.stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line)}.stats div{display:grid;gap:3px;padding:16px 20px}.stats div+div{border-left:1px solid var(--line)}.stats strong{font-size:32px;color:var(--lime);line-height:1.1}.stats span{color:#b9cabf}.listHead,.meta,.actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.listHead{margin:26px 0 12px}.listHead h2,.card h3{margin:0;letter-spacing:-.03em}.listHead select{width:auto}.card{border:1px solid var(--line);background:#15251d;padding:20px;margin:10px 0}.card h3{font-size:23px;margin:14px 0 4px}.card p{margin:5px 0}.meta{color:#b9cbba}.status{padding:3px 8px;border:1px solid #60816c;color:#d7e8da}.status.new{color:#ffac9c}.status.in_progress{color:#f4ce75}.status.resolved{color:var(--lime)}.actions{border-top:1px solid var(--line);padding-top:14px;margin-top:16px;justify-content:flex-start;align-items:flex-end}.actions label{max-width:100%}.actions select{padding:8px}.actions>span{align-self:center}.ev figure{margin:16px 0 0}.ev img{display:block;max-width:100%;max-height:220px}.ev figcaption{margin-top:5px}
@media(max-width:760px){.auth{grid-template-columns:1fr}.land{min-height:190px;border-right:0;border-bottom:1px solid var(--line)}.landText{padding:22px 24px;width:71%}.land h2{margin:8px 0;font-size:42px}.land p{display:none}.land .forest{left:28%;mask-image:linear-gradient(90deg,transparent,#000 24%)}.formArea{padding:24px 22px 44px;align-items:start}.formBox{max-width:470px}.formBox h1{margin-top:22px}.top{min-height:60px;padding:12px 20px;gap:14px}.wordmark{font-size:10px;padding-left:14px}.auth{min-height:0}.banner{padding:24px 16px;min-height:134px}.stats div{padding:12px 8px}.stats span{font-size:11px;letter-spacing:0}.dashboard{padding-top:12px}.card{padding:16px}.ev input,.ev select{font-size:16px}}
@media(max-width:410px){.wordmark{display:none}.landText{width:85%}.actions button{flex-grow:1}}
`


