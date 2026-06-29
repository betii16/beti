'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function AvatarUpload({ userId, currentUrl, initials, onUpload }: { userId:string; currentUrl:string|null; initials:string; onUpload:(url:string)=>void }) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string|null>(currentUrl)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5*1024*1024) { setErr('Max 5MB'); return }
    if (!file.type.startsWith('image/')) { setErr('Image uniquement'); return }
    setLoading(true); setErr('')
    const oldPreview = preview

    // Preview optimiste pendant l'upload
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('beti-photos').upload(path, file, { upsert: true })
    if (upErr) {
      setPreview(oldPreview)
      setErr(upErr.message.includes('security policy') ? 'Upload refusé — policies Storage manquantes (voir supabase/storage_policies.sql)' : 'Upload échoué : ' + upErr.message)
      setLoading(false); return
    }

    const { data } = supabase.storage.from('beti-photos').getPublicUrl(path)
    const finalUrl = data.publicUrl + '?t=' + Date.now()

    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: finalUrl }).eq('id', userId)
    if (dbErr) {
      setPreview(oldPreview)
      setErr('Enregistrement échoué : ' + dbErr.message)
      setLoading(false); return
    }

    onUpload(finalUrl)
    setLoading(false)
  }

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <div style={{ width:88, height:88, borderRadius:16, background:preview?'transparent':'#5A3DF015', border:'2px solid #5A3DF033', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'#5A3DF0', cursor:'pointer', position:'relative' }} onClick={()=>ref.current?.click()}>
        {preview ? <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s', fontSize:13, color:'#fff', fontWeight:300 }}
          onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
          {loading ? '...' : 'Modifier'}
        </div>
      </div>
      <div onClick={()=>ref.current?.click()} style={{ position:'absolute', bottom:-2, right:-2, width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#5A3DF0,#7C5CFF)', border:'2px solid var(--bg,#0b0b12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11, color:'#fff' }}>+</div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
      {err && <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:6, padding:'6px 10px', borderRadius:8, background:'#ef444418', border:'1px solid #ef444433', fontSize:10, color:'#ef4444', whiteSpace:'nowrap' }}>{err}</div>}
    </div>
  )
}

export function ProblemPhotosUpload({ bookingId, onUpload }: { bookingId:string; onUpload:(urls:string[])=>void }) {
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files||[])
    if (files.length+photos.length>5) { alert('Max 5 photos'); return }
    setLoading(true); setErr('')
    const urls:string[] = []
    let lastErr = ''
    for (const file of files) {
      if (file.size>10*1024*1024) { lastErr = 'Fichier > 10MB ignoré'; continue }
      const path = `problems/${bookingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('beti-photos').upload(path, file)
      if (!error) { const { data } = supabase.storage.from('beti-photos').getPublicUrl(path); urls.push(data.publicUrl) }
      else lastErr = 'Upload échoué : ' + error.message
    }
    if (lastErr) setErr(lastErr)
    const all = [...photos,...urls]; setPhotos(all); onUpload(all); setLoading(false)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        {photos.map(url => (
          <div key={url} style={{ position:'relative', width:80, height:80 }}>
            <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }}/>
            <button onClick={()=>{const u=photos.filter(p=>p!==url);setPhotos(u);onUpload(u)}} style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#ef4444', border:'none', color:'#fff', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        ))}
        {photos.length<5 && (
          <button onClick={()=>ref.current?.click()} disabled={loading} style={{ width:80, height:80, borderRadius:8, background:'var(--bg)', border:'1px dashed var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--tx3)', fontSize:11, gap:4 }}>
            <span style={{ fontSize:20 }}>{loading?'...':'+'}</span>Photo
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }}/>
      <p style={{ fontSize:11, color:'var(--tx3)' }}>{photos.length}/5 photos</p>
      {err && <p style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>{err}</p>}
    </div>
  )
}

export function PortfolioUpload({ artisanId, existingPhotos }: { artisanId:string; existingPhotos:string[] }) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files||[])
    if (files.length+photos.length>12) { alert('Max 12'); return }
    setLoading(true); setErr('')
    const urls:string[] = []
    let lastErr = ''
    for (const file of files) {
      const path = `portfolio/${artisanId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('beti-photos').upload(path, file)
      if (!error) { const { data } = supabase.storage.from('beti-photos').getPublicUrl(path); urls.push(data.publicUrl) }
      else lastErr = 'Upload échoué : ' + error.message
    }
    if (lastErr) setErr(lastErr)
    const all=[...photos,...urls];setPhotos(all);setLoading(false)
  }

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:10, marginBottom:12 }}>
        {photos.map((url,i) => (
          <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
            <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            <button onClick={async()=>{const u=photos.filter(p=>p!==url);setPhotos(u)}} style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', color:'#fff', cursor:'pointer', fontSize:10 }}>✕</button>
          </div>
        ))}
        {photos.length<12 && (
          <button onClick={()=>ref.current?.click()} style={{ aspectRatio:'1', borderRadius:10, background:'var(--bg)', border:'1px dashed var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--tx3)', fontSize:12, gap:6 }}>
            <span style={{ fontSize:24 }}>{loading?'...':'+'}</span>Ajouter
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }}/>
      <p style={{ fontSize:11, color:'var(--tx3)' }}>{photos.length}/12 portfolio</p>
      {err && <p style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>{err}</p>}
    </div>
  )
}

export function BeforeAfterUpload({ bookingId, artisanId }: { bookingId:string; artisanId:string }) {
  const [before, setBefore] = useState<string|null>(null)
  const [after, setAfter] = useState<string|null>(null)
  const [loading, setLoading] = useState<'before'|'after'|null>(null)
  const bRef = useRef<HTMLInputElement>(null)
  const aRef = useRef<HTMLInputElement>(null)

  const upload = async (file:File, type:'before'|'after') => {
    setLoading(type)
    const path = `interventions/${bookingId}/${type}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('beti-photos').upload(path, file, { upsert:true })
    if (!error) { const { data } = supabase.storage.from('beti-photos').getPublicUrl(path); if(type==='before')setBefore(data.publicUrl);else setAfter(data.publicUrl) }
    else alert('Upload échoué : ' + error.message)
    setLoading(null)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {[{type:'before' as const,label:'AVANT',val:before,ref:bRef,color:'#f59e0b'},{type:'after' as const,label:'APRÈS',val:after,ref:aRef,color:'#10b981'}].map(s=>(
        <div key={s.type}>
          <div style={{ fontSize:11, color:'var(--tx3)', fontWeight:700, marginBottom:8 }}>{s.label}</div>
          <div onClick={()=>s.ref.current?.click()} style={{ aspectRatio:'4/3', borderRadius:12, overflow:'hidden', background:'var(--bg)', border:`1px dashed ${s.val?'var(--border)':s.color}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {s.val ? <img src={s.val} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:12, color:s.color }}>{loading===s.type?'...':'+ Photo'}</span>}
          </div>
          <input ref={s.ref} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f,s.type)}}/>
        </div>
      ))}
    </div>
  )
}
