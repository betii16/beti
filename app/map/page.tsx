'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { haversineKm } from '@/lib/distance'
import { useLang } from '@/lib/LangContext'
import { useRouter } from 'next/navigation'
import { CategoryIcon } from '@/components/icons'
import { LayoutGrid } from 'lucide-react'

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

const CATS = [
  { id:'',           label:'Tous',         icon:'✳', color:'#6366f1' },
  { id:'plomberie',  label:'Plomberie',    icon:'⚙', color:'#3b82f6' },
  { id:'electricite',label:'Électricité',  icon:'⚡', color:'#f59e0b' },
  { id:'serrurerie', label:'Serrurerie',   icon:'⌘', color:'#ef4444' },
  { id:'menage',     label:'Ménage',       icon:'✦', color:'#10b981' },
  { id:'peinture',   label:'Peinture',     icon:'◉', color:'#f97316' },
  { id:'demenagement',label:'Déménagement',icon:'◈', color:'#8b5cf6' },
  { id:'jardinage',  label:'Jardinage',    icon:'❧', color:'#22c55e' },
  { id:'informatique',label:'Informatique',icon:'⬡', color:'#6366f1' },
  { id:'coiffure',   label:'Coiffure',     icon:'✂', color:'#ec4899' },
]

type Art = {
  id:string; full_name:string; avatar_url:string|null; category:string
  rating_avg:number; rating_count:number; hourly_rate:number; distance_km:number|null
  is_available:boolean; total_missions:number
}

const DEMO:Art[] = [
  {id:'d1',full_name:'Karim Benali',avatar_url:null,category:'plomberie',rating_avg:4.9,rating_count:84,hourly_rate:3500,distance_km:1.2,is_available:true,total_missions:312},
  {id:'d2',full_name:'Sofiane Amrani',avatar_url:null,category:'electricite',rating_avg:4.8,rating_count:127,hourly_rate:4000,distance_km:2.8,is_available:true,total_missions:198},
  {id:'d3',full_name:'Amina Kaci',avatar_url:null,category:'menage',rating_avg:5.0,rating_count:211,hourly_rate:2000,distance_km:0.9,is_available:true,total_missions:521},
  {id:'d4',full_name:'Riad Hamdi',avatar_url:null,category:'serrurerie',rating_avg:4.6,rating_count:48,hourly_rate:4500,distance_km:4.2,is_available:true,total_missions:89},
  {id:'d5',full_name:'Lina Hadj',avatar_url:null,category:'coiffure',rating_avg:4.9,rating_count:189,hourly_rate:2500,distance_km:2.1,is_available:true,total_missions:347},
  {id:'d6',full_name:'Fatima Zohra',avatar_url:null,category:'menage',rating_avg:4.8,rating_count:156,hourly_rate:1800,distance_km:1.8,is_available:true,total_missions:423},
  {id:'d7',full_name:'Walid Benmoussa',avatar_url:null,category:'informatique',rating_avg:4.8,rating_count:52,hourly_rate:4500,distance_km:5.6,is_available:true,total_missions:87},
  {id:'d8',full_name:'Mourad Khelifi',avatar_url:null,category:'serrurerie',rating_avg:4.9,rating_count:114,hourly_rate:5500,distance_km:2.3,is_available:true,total_missions:278},
]

function Stars({r,s=11}:{r:number;s?:number}){return<div style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><svg key={i} width={s} height={s} viewBox="0 0 24 24" fill={i<=Math.round(r)?'#f59e0b':'#ddd3'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

export default function MapPage() {
  const {t,isAr}=useLang()
  const router=useRouter()
  const [cat,setCat]=useState('')
  const [lat,setLat]=useState(36.7538)
  const [lng,setLng]=useState(3.0588)
  const [artisans,setArtisans]=useState<Art[]>([])
  const [loading,setLoading]=useState(true)
  const [sheetOpen,setSheetOpen]=useState(true)
  const [sheetFull,setSheetFull]=useState(false)
  const [selected,setSelected]=useState<Art|null>(null)
  const [search,setSearch]=useState('')
  const [user,setUser]=useState<any>(null)
  const [sent,setSent]=useState(false)

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{if(data.user)setUser(data.user)})
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(p=>{setLat(p.coords.latitude);setLng(p.coords.longitude)},()=>{})
    }
  },[])

  useEffect(()=>{loadArtisans()},[lat,lng,cat])

  const loadArtisans=async()=>{
    setLoading(true)
    let q=supabase.from('artisans').select('id,category,hourly_rate,is_available,rating_avg,rating_count,total_missions,bio,lat,lng,profiles(full_name,avatar_url)').limit(30)
    if(cat)q=q.eq('category',cat)
    const{data}=await q
    const real:Art[]=(data||[]).map((a:any)=>({id:a.id,full_name:a.profiles?.full_name||'Artisan',avatar_url:a.profiles?.avatar_url||null,category:a.category,rating_avg:a.rating_avg||0,rating_count:a.rating_count||0,hourly_rate:a.hourly_rate||0,distance_km:a.lat&&a.lng?haversineKm(lat,lng,a.lat,a.lng):null,is_available:a.is_available,total_missions:a.total_missions||0}))
    const demo=cat?DEMO.filter(d=>d.category===cat):DEMO
    const ids=new Set(real.map(a=>a.full_name))
    setArtisans([...real,...demo.filter(d=>!ids.has(d.full_name))])
    setLoading(false)
  }

  const contact=async(a:Art,ty:'message'|'call')=>{
    if(!user){router.push('/auth/login');return}
    const{error}=await supabase.from('bookings').insert({client_id:user.id,artisan_id:a.id,title:`Demande ${a.category}`,description:ty==='call'?'Appel':'Message',address:'',status:'pending',price_agreed:a.hourly_rate})
    if(error){setSent(true);return}
    supabase.from('notifications').insert({user_id:a.id,type:ty==='call'?'call_request':'new_message',title:ty==='call'?'Demande d\'appel':'Nouveau message',message:'Un client souhaite vous contacter.'}).then(()=>{})
    if(ty==='message'){const{data:b}=await supabase.from('bookings').select('id').eq('client_id',user.id).eq('artisan_id',a.id).order('created_at',{ascending:false}).limit(1).single();if(b?.id)router.push(`/chat/${b.id}`);else setSent(true)}else{setSent(true)}
  }

  const cc=(id:string)=>CATS.find(c=>c.id===id)?.color||'#6366f1'
  const cl=(id:string)=>CATS.find(c=>c.id===id)?.label||id
  const filtered=search?artisans.filter(a=>a.full_name.toLowerCase().includes(search.toLowerCase())||a.category.includes(search.toLowerCase())):artisans
  const visibleInSheet=sheetFull?filtered:filtered.slice(0,3)

  const bg='var(--bg)';const bg2='var(--bg2)'
  const tx='var(--tx)';const tx2='var(--tx2)';const tx3='var(--tx3)'
  const brd='var(--border)'
  const glass='var(--glass-bg)'

  return(
    <>
      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{overflow:hidden;background:#1a2030}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.3)}70%{box-shadow:0 0 0 10px rgba(99,102,241,0)}}
        .pill{padding:8px 16px;border-radius:24px;font-size:12px;font-weight:500;cursor:pointer;font-family:Nexa,sans-serif;border:none;transition:all 0.25s;white-space:nowrap;display:flex;align-items:center;gap:5px}
        .arow{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;cursor:pointer;transition:all 0.2s;border:1px solid transparent}
        .arow:hover{background:var(--bg3);border-color:var(--border)}
      `}</style>

      <div style={{position:'fixed',inset:0,overflow:'hidden'}}>

        {/* ═══ MAP — full screen ═══ */}
        <div style={{position:'absolute',inset:0,zIndex:1}}>
          <BetiMap clientLat={lat} clientLng={lng} showAllArtisans={true} categoryFilter={cat}/>
        </div>

        {/* ═══ FLOATING SEARCH BAR ═══ */}
        <div style={{position:'absolute',top:60,left:16,right:16,zIndex:10,animation:'fadeUp 0.4s ease'}}>
          <div style={{background:glass,backdropFilter:'blur(20px)',borderRadius:16,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'var(--card-shadow)',border:`0.5px solid ${brd}`}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tx3} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t('map.searchPlaceholder')}
              style={{flex:1,background:'transparent',border:'none',outline:'none',color:tx,fontSize:14,fontFamily:'Nexa,sans-serif',fontWeight:300}}/>
            {search&&<button onClick={()=>setSearch('')} style={{background:'transparent',border:'none',color:tx3,fontSize:16,cursor:'pointer'}}>✕</button>}
          </div>
        </div>

        {/* ═══ FLOATING CATEGORY PILLS ═══ */}
        <div style={{position:'absolute',top:120,left:0,right:0,zIndex:10,padding:'0 16px',animation:'fadeUp 0.4s ease 0.1s both'}}>
          <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4,msOverflowStyle:'none',scrollbarWidth:'none'}}>
            {CATS.map(c=>(
              <button key={c.id} onClick={()=>setCat(c.id)} className="pill"
                style={{background:cat===c.id?c.color:glass,color:cat===c.id?'#fff':tx2,backdropFilter:cat===c.id?'none':'blur(12px)',border:`0.5px solid ${cat===c.id?'transparent':brd}`,boxShadow:cat===c.id?`0 2px 12px ${c.color}44`:'none'}}>
                {c.id ? <CategoryIcon id={c.id} size={14}/> : <LayoutGrid size={14}/>}{c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ LOCATE ME button ═══ */}
        <button onClick={()=>{navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude);setLng(p.coords.longitude)})}}
          style={{position:'absolute',right:16,bottom:sheetOpen?(sheetFull?'65%':'260px'):'80px',zIndex:10,width:44,height:44,borderRadius:'50%',background:glass,backdropFilter:'blur(12px)',border:`0.5px solid ${brd}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--card-shadow)',transition:'bottom 0.3s ease'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tx} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
        </button>

        {/* ═══ BOTTOM SHEET ═══ */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:20,maxHeight:sheetFull?'70vh':'260px',background:glass,backdropFilter:'blur(24px)',borderRadius:'20px 20px 0 0',boxShadow:'var(--card-shadow)',border:`0.5px solid ${brd}`,borderBottom:'none',transition:'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',overflowY:'auto',animation:'slideUp 0.4s ease 0.2s both'}}>

          {/* Handle */}
          <div onClick={()=>setSheetFull(!sheetFull)} style={{padding:'10px 0 6px',cursor:'pointer',display:'flex',justifyContent:'center'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'var(--border2)'}}/>
          </div>

          {/* Sheet header */}
          <div style={{padding:'4px 20px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:tx}}>{filtered.length} artisan{filtered.length>1?'s':''} {cat?cl(cat).toLowerCase():''}</div>
              <div style={{fontSize:12,color:tx3,fontWeight:300}}>à proximité</div>
            </div>
            <button onClick={()=>setSheetOpen(!sheetOpen)}
              style={{padding:'6px 14px',borderRadius:10,background:'var(--border)',border:'none',color:tx2,fontSize:11,cursor:'pointer',fontFamily:'Nexa,sans-serif',fontWeight:300}}>
              {sheetOpen?'Masquer':'Afficher'}
            </button>
          </div>

          {/* Artisan list */}
          {sheetOpen&&(
            <div style={{padding:'0 16px 20px'}}>
              {loading?(
                <div style={{textAlign:'center',padding:'20px',color:tx3,fontSize:13}}>Recherche...</div>
              ):filtered.length===0?(
                <div style={{textAlign:'center',padding:'20px',color:tx3,fontSize:13}}>Aucun artisan trouvé</div>
              ):(
                <>
                  {visibleInSheet.map(a=>{
                    const c=cc(a.category)
                    const init=a.full_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
                    const isSelected=selected?.id===a.id
                    return(
                      <div key={a.id} className="arow" onClick={()=>setSelected(isSelected?null:a)}
                        style={{borderColor:isSelected?c+'44':'transparent',background:isSelected?`${c}12`:'transparent',marginBottom:4}}>

                        {/* Avatar */}
                        {a.avatar_url?(
                          <img src={a.avatar_url} alt="" style={{width:44,height:44,borderRadius:12,objectFit:'cover',border:`2px solid ${c}33`,flexShrink:0}}/>
                        ):(
                          <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${c}30,${c}15)`,border:`2px solid ${c}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:c,flexShrink:0}}>{init}</div>
                        )}

                        {/* Info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                            <span style={{fontSize:14,fontWeight:700,color:tx}}>{a.full_name}</span>
                            <span style={{fontSize:10,color:c,fontWeight:700}}>{cl(a.category)}</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:tx2}}>
                            <span style={{display:'flex',alignItems:'center',gap:3}}>
                              <Stars r={a.rating_avg} s={10}/>{a.rating_avg.toFixed(1)}
                            </span>
                            <span>·</span>
                            <span>{a.distance_km!=null?`${a.distance_km.toFixed(1)} km`:'—'}</span>
                            <span>·</span>
                            <span>{a.total_missions} missions</span>
                          </div>
                        </div>

                        {/* Price + CTA */}
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:15,fontWeight:800,color:tx}}>{a.hourly_rate.toLocaleString('fr-DZ')} <span style={{fontSize:10,color:tx3,fontWeight:300}}>DA</span></div>
                          {a.is_available&&<div style={{display:'flex',alignItems:'center',gap:3,justifyContent:'flex-end',marginTop:2}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 6px #10b98155'}}/>
                            <span style={{fontSize:10,color:'#10b981',fontWeight:500}}>En ligne</span>
                          </div>}
                        </div>
                      </div>
                    )
                  })}

                  {/* Show more */}
                  {!sheetFull&&filtered.length>3&&(
                    <button onClick={()=>setSheetFull(true)}
                      style={{width:'100%',padding:'12px',borderRadius:12,background:'var(--bg3)',border:`0.5px solid ${brd}`,color:tx2,fontSize:12,cursor:'pointer',fontFamily:'Nexa,sans-serif',fontWeight:300,marginTop:4}}>
                      Voir les {filtered.length-3} autres artisans
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══ SELECTED ARTISAN CARD (floating) ═══ */}
        {selected&&(
          <div style={{position:'absolute',bottom:sheetOpen?(sheetFull?'72%':'268px'):'8px',left:16,right:16,zIndex:25,animation:'fadeUp 0.3s ease'}}>
            <div style={{background:bg2,border:`1px solid ${brd}`,borderRadius:18,padding:'18px 20px',boxShadow:'var(--card-shadow)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                {selected.avatar_url?(
                  <img src={selected.avatar_url} alt="" style={{width:52,height:52,borderRadius:14,objectFit:'cover',border:`2px solid ${cc(selected.category)}33`}}/>
                ):(
                  <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${cc(selected.category)}30,${cc(selected.category)}15)`,border:`2px solid ${cc(selected.category)}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:cc(selected.category)}}>{selected.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                )}
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:16,fontWeight:800,color:tx}}>{selected.full_name}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#6366f1"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:tx2}}>
                    <span style={{color:cc(selected.category),fontWeight:700}}>{cl(selected.category)}</span>
                    <span>·</span>
                    <Stars r={selected.rating_avg} s={11}/>
                    <span style={{fontWeight:700,color:'#f59e0b'}}>{selected.rating_avg.toFixed(1)}</span>
                    <span>({selected.rating_count})</span>
                  </div>
                </div>
                <button onClick={()=>{setSelected(null);setSent(false)}} style={{background:'transparent',border:'none',color:tx3,fontSize:18,cursor:'pointer',padding:4}}>✕</button>
              </div>

              {/* Quick stats */}
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                {[
                  {v:selected.distance_km!=null?`${selected.distance_km.toFixed(1)} km`:'—',c:'#10b981'},
                  {v:`${selected.total_missions} missions`,c:tx2},
                  {v:`${selected.hourly_rate.toLocaleString('fr-DZ')} DA`,c:'#6366f1'},
                ].map(s=>(
                  <div key={s.v} style={{flex:1,padding:'8px',borderRadius:10,background:'var(--bg3)',border:`0.5px solid ${brd}`,textAlign:'center',fontSize:12,color:s.c,fontWeight:500}}>{s.v}</div>
                ))}
              </div>

              {/* Action buttons */}
              {sent?(
                <div style={{padding:'12px',borderRadius:12,background:'#10b98112',border:'1px solid #10b98122',textAlign:'center'}}>
                  <span style={{fontSize:13,color:'#10b981',fontWeight:700}}>Demande envoyée</span>
                </div>
              ):(
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>contact(selected,'message')}
                    style={{flex:1,padding:'12px 20px',borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif',boxShadow:'0 4px 16px #6366f133'}}>
                    Envoyer un message
                  </button>
                  <button onClick={()=>contact(selected,'call')}
                    style={{padding:'12px 16px',borderRadius:12,background:'transparent',border:'1px solid #10b98144',color:'#10b981',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>
                    Appeler
                  </button>
                  <a href={`/artisan/${selected.id}`} style={{textDecoration:'none'}}>
                    <button style={{padding:'12px 14px',borderRadius:12,background:'transparent',border:`1px solid ${brd}`,color:tx2,fontSize:13,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>
                      Profil
                    </button>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
