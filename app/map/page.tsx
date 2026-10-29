'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { haversineKm } from '@/lib/distance'
import { contactArtisan, isDemoArtisan } from '@/lib/contactArtisan'
import { fetchPlans, isListed } from '@/lib/subscription'
import BookingFlow from '@/components/BookingFlow'
import { useLang } from '@/lib/LangContext'
import { useRouter } from 'next/navigation'
import { CategoryIcon, categoryColor, categoryInk, pressable } from '@/components/icons'
import { LayoutGrid, X, Search, LocateFixed, BadgeCheck, SearchX } from 'lucide-react'

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

const CAT_IDS = ['', 'plomberie', 'electricite', 'serrurerie', 'menage', 'peinture', 'demenagement', 'jardinage', 'informatique', 'coiffure']

// Libellés propres à la carte (FR / AR) — étaient codés en dur en français.
const L = {
  all:       { fr: 'Tous',                ar: 'الكل' },
  artisan:   { fr: 'artisan',             ar: 'حرفي' },
  artisans:  { fr: 'artisans',            ar: 'حرفيين' },
  nearby:    { fr: 'à proximité',         ar: 'بالقرب منك' },
  hide:      { fr: 'Masquer',             ar: 'إخفاء' },
  show:      { fr: 'Afficher',            ar: 'إظهار' },
  none:      { fr: 'Aucun artisan dans cette zone', ar: 'لا يوجد حرفي في هذه المنطقة' },
  seeMore:   { fr: 'Voir les {n} autres artisans', ar: 'عرض {n} حرفيين آخرين' },
  missions:  { fr: 'missions',            ar: 'مهمة' },
  profile:   { fr: 'Profil',              ar: 'الملف' },
  locate:    { fr: 'Me localiser',        ar: 'تحديد موقعي' },
  clear:     { fr: 'Effacer',             ar: 'مسح' },
  close:     { fr: 'Fermer',              ar: 'إغلاق' },
  expand:    { fr: 'Agrandir la liste',   ar: 'توسيع القائمة' },
} as const

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

function Stars({r,s=11}:{r:number;s?:number}){return<div role="img" aria-label={`${(r||0).toFixed(1)} / 5`} style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><svg key={i} aria-hidden width={s} height={s} viewBox="0 0 24 24" fill={i<=Math.round(r)?'var(--star)':'var(--border2)'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

export default function MapPage() {
  const {t,isAr,lang}=useLang()
  const tr=(k:keyof typeof L)=>L[k][lang==='ar'?'ar':'fr']
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
    // Paywall : hors période de lancement, on masque les non-abonnés.
    const plans=await fetchPlans((data||[]).map((a:any)=>a.id))
    const real:Art[]=(data||[]).filter((a:any)=>isListed({plan:plans[a.id]||'free'})).map((a:any)=>({id:a.id,full_name:a.profiles?.full_name||'Artisan',avatar_url:a.profiles?.avatar_url||null,category:a.category,rating_avg:a.rating_avg||0,rating_count:a.rating_count||0,hourly_rate:a.hourly_rate||0,distance_km:a.lat&&a.lng?haversineKm(lat,lng,a.lat,a.lng):null,is_available:a.is_available,total_missions:a.total_missions||0}))
    // Démo en SECOURS uniquement : s'il existe de vrais artisans, on n'affiche
    // qu'eux (pas de faux profils mélangés en production).
    if(real.length>0){setArtisans(real);setLoading(false);return}
    const demo=cat?DEMO.filter(d=>d.category===cat):DEMO
    setArtisans(demo)
    setLoading(false)
  }

  const [contactErr,setContactErr]=useState('')
  const [booking,setBooking]=useState(false)
  const contact=async(a:Art,ty:'message'|'call')=>{
    if(!user){router.push('/auth/login?next='+encodeURIComponent(window.location.pathname));return}
    setContactErr('')
    if(isDemoArtisan(a.id)){setContactErr(t('contact.demoProfile'));return}
    if(ty==='message'){setBooking(true);return}
    const res=await contactArtisan({clientId:user.id,artisanId:a.id,category:a.category,hourlyRate:a.hourly_rate,type:ty})
    if(!res.ok){setContactErr(res.message);return}
    setSent(true)
  }

  const cc=(id:string)=>categoryColor(id)
  const cl=(id:string)=>id?t(`categories.${id}`):tr('all')
  const filtered=search?artisans.filter(a=>a.full_name.toLowerCase().includes(search.toLowerCase())||a.category.includes(search.toLowerCase())||cl(a.category).toLowerCase().includes(search.toLowerCase())):artisans
  const visibleInSheet=sheetFull?filtered:filtered.slice(0,3)

  const bg2='var(--bg2)'
  const tx='var(--tx)';const tx2='var(--tx2)';const tx3='var(--tx3)'
  const brd='var(--border)'
  // Surfaces flottantes MATES (plus de verre dépoli) : chaux/nuit opaques.
  const surface='var(--bg2)'
  const initials=(n:string)=>n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)

  return(
    <>
      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{overflow:hidden}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .pill{min-height:40px;padding:8px 15px;border-radius:var(--r-pill);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;
          display:flex;align-items:center;gap:6px;flex-shrink:0;transition:background .2s ease,border-color .2s ease,color .2s ease}
        .pill:hover{border-color:var(--border2)}
        .arow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-card);cursor:pointer;transition:background .2s ease,border-color .2s ease;border:1px solid transparent}
        .arow:hover{background:var(--bg3);border-color:var(--border)}
        .map-float{background:${surface};border:1px solid ${brd};box-shadow:0 2px 0 rgba(0,0,0,0.03),0 12px 28px -14px rgba(14,25,34,0.45)}
      `}</style>

      <div className="map-screen" style={{position:'fixed',inset:0,overflow:'hidden',background:'var(--bg)',direction:isAr?'rtl':'ltr'}}>

        {/* ═══ MAP — full screen ═══ */}
        <div style={{position:'absolute',inset:0,zIndex:1}}>
          <BetiMap clientLat={lat} clientLng={lng} showAllArtisans={true} categoryFilter={cat} focusOffsetY={80}/>
        </div>

        {/* ═══ FLOATING SEARCH BAR ═══ */}
        <div className="map-search" style={{position:'absolute',top:60,left:16,right:16,zIndex:10,animation:'fadeUp 0.4s ease',maxWidth:560,marginInline:'auto'}}>
          <div className="map-float search-pill" style={{borderRadius:'var(--r-card)',paddingInlineStart:16,paddingInlineEnd:6,minHeight:50,display:'flex',alignItems:'center',gap:10}}>
            <Search size={18} color="var(--tx3)" aria-hidden/>
            <input type="search" enterKeyHint="search" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t('map.searchPlaceholder')} aria-label={t('map.searchPlaceholder')} className="bare-input"
              style={{flex:1,minWidth:0,background:'transparent',border:'none',outline:'none',color:tx,fontSize:16,padding:'12px 0'}}/>
            {search&&<button onClick={()=>setSearch('')} aria-label={tr('clear')} className="icon-btn" style={{margin:0,width:40,height:40}}><X size={17}/></button>}
          </div>
        </div>

        {/* ═══ FLOATING CATEGORY PILLS ═══ */}
        <div className="map-pills" style={{position:'absolute',top:120,left:0,right:0,zIndex:10,animation:'fadeUp 0.4s ease 0.1s both'}}>
          <div className="no-scrollbar" style={{display:'flex',gap:6,overflowX:'auto',padding:'2px 16px 6px',scrollPaddingInline:16}}>
            {CAT_IDS.map(id=>{
              const on=cat===id
              return(
                <button key={id||'all'} onClick={()=>setCat(id)} aria-pressed={on} className={`pill${on?'':' map-float'}`}
                  style={on
                    ?{background:'var(--accent-fill)',color:'var(--on-accent)',border:'1px solid transparent',boxShadow:'0 2px 0 color-mix(in srgb, var(--accent-fill) 55%, #000), 0 10px 18px -10px var(--accent-fill)'}
                    :{color:tx2}}>
                  {id ? <CategoryIcon id={id} size={15} color={on?'currentColor':cc(id)}/> : <LayoutGrid size={15}/>}{cl(id)}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══ LOCATE ME button ═══ */}
        <button onClick={()=>{navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude);setLng(p.coords.longitude)})}}
          aria-label={tr('locate')} title={tr('locate')} className="map-float"
          style={{position:'absolute',insetInlineEnd:16,bottom:sheetOpen?(sheetFull?'calc(70vh + 12px)':'272px'):'84px',zIndex:10,width:48,height:48,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'bottom 0.3s ease',color:tx}}>
          <LocateFixed size={20}/>
        </button>

        {/* ═══ BOTTOM SHEET ═══ */}
        <div className="map-float" style={{position:'absolute',bottom:0,left:0,right:0,zIndex:20,maxWidth:720,marginInline:'auto',maxHeight:sheetFull?'70vh':'260px',borderRadius:'20px 20px 0 0',borderBottom:'none',transition:'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',overflowY:'auto',animation:'slideUp 0.4s ease 0.2s both'}}>

          {/* Handle */}
          <button onClick={()=>setSheetFull(!sheetFull)} aria-label={tr('expand')} aria-expanded={sheetFull} style={{width:'100%',padding:'10px 0 8px',cursor:'pointer',display:'flex',justifyContent:'center',background:'transparent',border:'none'}}>
            <span style={{width:40,height:4,borderRadius:2,background:'var(--border2)'}}/>
          </button>

          {/* Sheet header */}
          <div style={{padding:'2px 20px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:17,fontWeight:800,color:tx}}><span className="num">{filtered.length}</span> {filtered.length>1?tr('artisans'):tr('artisan')}{cat?<span style={{color:categoryInk(cat)}}> · {cl(cat)}</span>:''}</div>
              <div style={{fontSize:12.5,color:tx2}}>{tr('nearby')}</div>
            </div>
            <button onClick={()=>setSheetOpen(!sheetOpen)} aria-expanded={sheetOpen} className="btn-ghost btn-sm">
              {sheetOpen?tr('hide'):tr('show')}
            </button>
          </div>

          {/* Artisan list */}
          {sheetOpen&&(
            <div style={{padding:'0 12px 20px'}}>
              {loading?(
                <div aria-busy="true" style={{display:'flex',flexDirection:'column',gap:6,padding:'0 4px'}}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 4px'}}>
                      <div className="skeleton" style={{width:44,height:44,borderRadius:12,flexShrink:0}}/>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}><div className="skeleton" style={{width:'50%',height:12}}/><div className="skeleton" style={{width:'70%',height:10}}/></div>
                      <div className="skeleton" style={{width:52,height:18}}/>
                    </div>
                  ))}
                </div>
              ):filtered.length===0?(
                <div className="empty-state" style={{padding:'18px 12px 10px'}}>
                  <div className="empty-icon" style={{width:48,height:48}}><SearchX size={20}/></div>
                  <div className="empty-title" style={{fontSize:14.5}}>{tr('none')}</div>
                </div>
              ):(
                <>
                  {visibleInSheet.map(a=>{
                    const c=cc(a.category)
                    const isSelected=selected?.id===a.id
                    const pick=()=>{setSelected(isSelected?null:a);setSent(false);setContactErr('')}
                    return(
                      <div key={a.id} className="arow" onClick={pick} {...pressable(pick)} aria-pressed={isSelected}
                        style={{borderColor:isSelected?c+'55':undefined,background:isSelected?`${c}12`:undefined,marginBottom:4}}>

                        {/* Avatar */}
                        {a.avatar_url?(
                          <img src={a.avatar_url} alt="" style={{width:44,height:44,borderRadius:12,objectFit:'cover',border:`2px solid ${c}55`,flexShrink:0}}/>
                        ):(
                          <div aria-hidden style={{width:44,height:44,borderRadius:12,background:`${c}1F`,border:`2px solid ${c}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:categoryInk(a.category),flexShrink:0}}>{initials(a.full_name)}</div>
                        )}

                        {/* Info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:3,minWidth:0}}>
                            <span style={{fontSize:14.5,fontWeight:700,color:tx,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.full_name}</span>
                            <span style={{fontSize:11.5,color:categoryInk(a.category),fontWeight:700,whiteSpace:'nowrap'}}>{cl(a.category)}</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',columnGap:6,rowGap:2,fontSize:12,color:tx2}}>
                            <Stars r={a.rating_avg} s={10}/><span className="num" style={{color:'var(--laiton)',fontWeight:700}}>{a.rating_avg.toFixed(1)}</span>
                            <span aria-hidden style={{color:tx3}}>·</span>
                            <span>{a.distance_km!=null?`${a.distance_km.toFixed(1)} km`:'—'}</span>
                            <span aria-hidden style={{color:tx3}}>·</span>
                            <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{a.total_missions} {tr('missions')}</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{textAlign:'end',flexShrink:0}}>
                          <div className="num" style={{fontSize:15,fontWeight:700,color:tx}}>{a.hourly_rate.toLocaleString('fr-DZ')} <span style={{fontSize:10.5,color:tx3,fontWeight:400}}>{t('common.da')}</span></div>
                          {a.is_available&&<div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',marginTop:3}}>
                            <span aria-hidden style={{width:6,height:6,borderRadius:'50%',background:'var(--success)'}}/>
                            <span style={{fontSize:11,color:'var(--success)',fontWeight:600}}>{t('common.online')}</span>
                          </div>}
                        </div>
                      </div>
                    )
                  })}

                  {/* Show more */}
                  {!sheetFull&&filtered.length>3&&(
                    <button onClick={()=>setSheetFull(true)} className="btn-ghost btn-block" style={{marginTop:4}}>
                      {tr('seeMore').replace('{n}',String(filtered.length-3))}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══ SELECTED ARTISAN CARD (floating) ═══ */}
        {selected&&(
          <div style={{position:'absolute',bottom:sheetOpen?(sheetFull?'calc(70vh + 8px)':'268px'):'8px',left:12,right:12,zIndex:25,maxWidth:560,marginInline:'auto',animation:'fadeUp 0.3s ease'}}>
            <div className="card" role="dialog" aria-label={selected.full_name} style={{padding:'16px 18px',boxShadow:'0 18px 40px -16px rgba(14,25,34,0.5)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                {selected.avatar_url?(
                  <img src={selected.avatar_url} alt="" style={{width:52,height:52,borderRadius:14,objectFit:'cover',border:`2px solid ${cc(selected.category)}55`}}/>
                ):(
                  <div aria-hidden style={{width:52,height:52,borderRadius:14,background:`${cc(selected.category)}1F`,border:`2px solid ${cc(selected.category)}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:categoryInk(selected.category),flexShrink:0}}>{initials(selected.full_name)}</div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontSize:16,fontWeight:800,color:tx,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.full_name}</span>
                    <BadgeCheck size={15} color="var(--accent)" strokeWidth={2.2} style={{flexShrink:0}}/>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:tx2,flexWrap:'wrap'}}>
                    <span style={{color:categoryInk(selected.category),fontWeight:700}}>{cl(selected.category)}</span>
                    <span aria-hidden>·</span>
                    <Stars r={selected.rating_avg} s={11}/>
                    <span className="num" style={{fontWeight:700,color:'var(--laiton)'}}>{selected.rating_avg.toFixed(1)}</span>
                    <span>({selected.rating_count})</span>
                  </div>
                </div>
                <button onClick={()=>{setSelected(null);setSent(false)}} aria-label={tr('close')} className="icon-btn"><X size={19}/></button>
              </div>

              {/* Quick stats */}
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                {[
                  {v:selected.distance_km!=null?`${selected.distance_km.toFixed(1)} km`:'—'},
                  {v:`${selected.total_missions} ${tr('missions')}`},
                  {v:`${selected.hourly_rate.toLocaleString('fr-DZ')} ${t('common.da')}`,strong:true},
                ].map(s=>(
                  <div key={s.v} className="num" style={{flex:1,padding:'9px 6px',borderRadius:10,background:'var(--bg3)',border:`1px solid ${brd}`,textAlign:'center',fontSize:12.5,color:s.strong?tx:tx2,fontWeight:s.strong?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.v}</div>
                ))}
              </div>

              {/* Action buttons */}
              {contactErr&&(
                <div role="alert" className="tone-danger" style={{padding:'10px 14px',borderRadius:'var(--r-field)',marginBottom:8,fontSize:13}}>{contactErr}</div>
              )}
              {sent?(
                <div role="status" className="tone-success" style={{padding:12,borderRadius:'var(--r-card)',textAlign:'center',fontSize:14,fontWeight:700}}>
                  {t('profile.requestSent')}
                </div>
              ):(
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>contact(selected,'message')} className="btn-primary" style={{flex:1,minWidth:0,padding:'12px 14px'}}>
                    {t('home.sendMessage')}
                  </button>
                  <button onClick={()=>contact(selected,'call')} className="btn-ghost btn-call" style={{padding:'12px 14px'}}>
                    {t('home.call')}
                  </button>
                  <a href={`/artisan/${selected.id}`} className="btn-ghost" style={{padding:'12px 14px'}}>
                    {tr('profile')}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {booking&&user&&selected&&(
          <BookingFlow
            artisan={{id:selected.id,name:selected.full_name,category:selected.category,hourlyRate:selected.hourly_rate||0,color:cc(selected.category)}}
            clientId={user.id}
            onClose={()=>setBooking(false)}
          />
        )}
      </div>
    </>
  )
}
