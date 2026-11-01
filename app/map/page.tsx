'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { haversineKm } from '@/lib/distance'
import { contactArtisan } from '@/lib/contactArtisan'
import { fetchArtisanMarkers, type ArtisanMarker } from '@/lib/artisanMarker'
import BookingFlow from '@/components/BookingFlow'
import { useLang } from '@/lib/LangContext'
import { useRouter } from 'next/navigation'
import { CategoryIcon, categoryColor, categoryInk, pressable } from '@/components/icons'
import { LayoutGrid, X, Search, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react'

const BetiMap = dynamic(() => import('@/components/BetiMap'), { ssr: false })

const CAT_IDS = ['', 'plomberie', 'electricite', 'serrurerie', 'menage', 'peinture', 'demenagement', 'jardinage', 'informatique', 'coiffure']

type Art = {
  id:string; full_name:string; avatar_url:string|null; category:string
  rating_avg:number; rating_count:number; hourly_rate:number; distance_km:number|null
  is_available:boolean; total_missions:number
}

function Stars({r,s=11}:{r:number;s?:number}){return<div role="img" aria-label={`${(r||0).toFixed(1)} / 5`} style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><svg key={i} aria-hidden width={s} height={s} viewBox="0 0 24 24" fill={i<=Math.round(r)?'var(--star)':'var(--border2)'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

// Illustration sobre de l'état vide : repères de carte + pin.
function EmptyArt(){
  return(
    <svg aria-hidden width="96" height="72" viewBox="0 0 96 72" fill="none" style={{color:'var(--accent)'}}>
      <path d="M6 58 L30 44 L54 54 L90 34" stroke="var(--border2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 22 L40 30 L66 16" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="48" cy="62" r="7" fill="color-mix(in srgb, currentColor 14%, transparent)"/>
      <path d="M48 56 C48 56 36 43 36 32 a12 12 0 0 1 24 0 C60 43 48 56 48 56Z" fill="currentColor"/>
      <circle cx="48" cy="32" r="4.5" fill="var(--bg2)"/>
    </svg>
  )
}

export default function MapPage() {
  const {t,isAr}=useLang()
  const router=useRouter()
  const [cat,setCat]=useState('')
  const [lat,setLat]=useState(36.7538)
  const [lng,setLng]=useState(3.0588)
  const [markers,setMarkers]=useState<ArtisanMarker[]>([])
  const [loading,setLoading]=useState(true)
  const [loadFailed,setLoadFailed]=useState(false)
  const [sheetFull,setSheetFull]=useState(false)
  const [selected,setSelected]=useState<Art|null>(null)
  const [search,setSearch]=useState('')
  const [user,setUser]=useState<any>(null)
  const [sent,setSent]=useState(false)
  const [sheetH,setSheetH]=useState(0)
  const [wide,setWide]=useState(false)
  const screenRef=useRef<HTMLDivElement>(null)
  const sheetRef=useRef<HTMLElement>(null)

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{if(data.user)setUser(data.user)})
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(p=>{setLat(p.coords.latitude);setLng(p.coords.longitude)},()=>{})
    }
  },[])

  useEffect(()=>{loadArtisans()},[])
  // Distances et filtre de catégorie dérivés des marqueurs (pas de requête sur chaque déplacement/filtre).
  const artisans=useMemo<Art[]>(()=>markers.filter(a=>!cat||a.category===cat).map(a=>({id:a.id,full_name:a.name,avatar_url:a.avatar,category:a.category,rating_avg:a.rating,rating_count:a.ratingCount||0,hourly_rate:a.price,distance_km:haversineKm(lat,lng,a.lat,a.lng),is_available:a.available,total_missions:a.missions||0})),[markers,cat,lat,lng])

  // Hauteur réelle du panneau : place les boutons de zoom juste au-dessus et cadre la sélection.
  useEffect(()=>{
    const mq=window.matchMedia('(min-width: 768px)')
    const sync=()=>setWide(mq.matches)
    sync();mq.addEventListener('change',sync)
    const el=sheetRef.current
    let ro:ResizeObserver|undefined
    if(el){
      ro=new ResizeObserver(()=>{
        const h=el.getBoundingClientRect().height
        setSheetH(h)
        screenRef.current?.style.setProperty('--map-sheet-h',`${Math.round(h)}px`)
      })
      ro.observe(el)
    }
    return()=>{mq.removeEventListener('change',sync);ro?.disconnect()}
  },[])

  // Unique requête artisans : partagée avec BetiMap (qui ne requête plus lui-même).
  const loadArtisans=async()=>{
    setLoadFailed(false);setLoading(true)
    const rows=await fetchArtisanMarkers()
    if(rows){setMarkers(rows)}else{setMarkers([]);setLoadFailed(true)}
    setLoading(false)
  }

  const [contactErr,setContactErr]=useState('')
  const [booking,setBooking]=useState(false)
  const contact=async(a:Art,ty:'message'|'call')=>{
    if(!user){router.push('/auth/login?next='+encodeURIComponent(window.location.pathname));return}
    setContactErr('')
    if(ty==='message'){setBooking(true);return}
    const res=await contactArtisan({clientId:user.id,artisanId:a.id,category:a.category,hourlyRate:a.hourly_rate,type:ty})
    if(!res.ok){setContactErr(res.message);return}
    setSent(true)
  }

  const cc=(id:string)=>categoryColor(id)
  const cl=(id:string)=>id?t(`categories.${id}`):t('map2.all')
  const q=search.trim().toLowerCase()
  const filtered=q?artisans.filter(a=>a.full_name.toLowerCase().includes(q)||a.category.includes(q)||cl(a.category).toLowerCase().includes(q)):artisans
  const initials=(n:string)=>n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)
  const pick=(a:Art|null)=>{setSelected(a);setSent(false);setContactErr('')}
  const fromMap=(id:string|null)=>pick(id?(artisans.find(a=>a.id===id)||null):null)

  const Avatar=({a,size}:{a:Art;size:number})=>{
    const c=cc(a.category)
    return a.avatar_url
      ?<img src={a.avatar_url} alt="" width={size} height={size} loading="lazy" decoding="async" style={{width:size,height:size,borderRadius:12,objectFit:'cover',border:`2px solid ${c}55`,flexShrink:0}}/>
      :<div aria-hidden style={{width:size,height:size,borderRadius:12,background:`${c}1F`,border:`2px solid ${c}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.34,fontWeight:800,color:categoryInk(a.category),flexShrink:0}}>{initials(a.full_name)}</div>
  }

  const count=filtered.length

  return(
    <div ref={screenRef} className="map-screen" style={{direction:isAr?'rtl':'ltr'}}>
      <h1 className="sr-only">{t('cxu.mapTitle')}</h1>

      {/* Carte plein écran */}
      <div className="map-canvas">
        <BetiMap artisansData={markers} onRefresh={loadArtisans} clientLat={lat} clientLng={lng} showAllArtisans={true} categoryFilter={cat}
          selectedId={selected?.id??null} onSelect={fromMap} bottomInset={wide?0:sheetH}
          onLocate={c=>{setLat(c.latitude);setLng(c.longitude)}}/>
      </div>

      {/* Recherche + filtres : conteneur transparent, seuls les enfants captent les clics */}
      <div className="map-top">
        <div className="map-float map-searchbox">
          <Search size={18} color="var(--tx3)" aria-hidden/>
          <input type="search" enterKeyHint="search" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={t('map.searchPlaceholder')} aria-label={t('map.searchPlaceholder')} className="bare-input map-input"/>
          {search&&<button onClick={()=>setSearch('')} aria-label={t('map2.clear')} className="icon-btn map-clear"><X size={17}/></button>}
        </div>
        <div className="map-chips no-scrollbar" role="group" aria-label={t('map2.all')}>
          {CAT_IDS.map(id=>{
            const on=cat===id
            return(
              <button key={id||'all'} onClick={()=>setCat(id)} aria-pressed={on} className={`map-chip${on?' is-on':' map-float'}`}>
                {id?<CategoryIcon id={id} size={16} color={on?'currentColor':cc(id)}/>:<LayoutGrid size={16}/>}{cl(id)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Panneau : bottom-sheet sur mobile, colonne latérale sur desktop */}
      <section ref={sheetRef} className="map-sheet map-float" data-full={sheetFull} data-detail={!!selected} data-empty={count===0&&!loading&&!selected}>
        <button className="map-handle" onClick={()=>setSheetFull(!sheetFull)} aria-label={sheetFull?t('map2.collapse'):t('map2.expand')} aria-expanded={sheetFull}>
          <span/>
        </button>

        {selected?(
          <div className="map-detail" role="region" aria-label={selected.full_name}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>pick(null)} aria-label={t('map2.back')} className="icon-btn" style={{margin:0,flexShrink:0}}>
                <ArrowLeft size={20} style={{transform:isAr?'scaleX(-1)':undefined}}/>
              </button>
              <Avatar a={selected} size={52}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:17,fontWeight:800,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.full_name}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--tx2)',flexWrap:'wrap'}}>
                  <span style={{color:categoryInk(selected.category),fontWeight:700}}>{cl(selected.category)}</span>
                  <span aria-hidden>·</span>
                  <Stars r={selected.rating_avg} s={12}/>
                  <span className="num" style={{fontWeight:700,color:'var(--laiton)'}}>{selected.rating_avg.toFixed(1)}</span>
                  <span>({selected.rating_count})</span>
                </div>
              </div>
            </div>

            <div className="map-stats">
              <div><b className="num">{selected.distance_km!=null?`${selected.distance_km.toFixed(1)} km`:'—'}</b></div>
              <div><b className="num">{selected.total_missions}</b> {t('map2.missions')}</div>
              <div><b className="num">{selected.hourly_rate.toLocaleString('fr-DZ')}</b> {t('common.da')}</div>
              <div className={selected.is_available?'is-ok':''}>
                <span aria-hidden className="map-dot" style={{background:selected.is_available?'var(--success)':'var(--tx3)'}}/>{selected.is_available?t('map2.available'):t('map2.busy')}
              </div>
            </div>

            {contactErr&&<div role="alert" className="tone-danger" style={{padding:'10px 14px',borderRadius:'var(--r-field)',fontSize:13}}>{contactErr}</div>}
            {sent?(
              <div role="status" className="tone-success" style={{padding:12,borderRadius:'var(--r-card)',textAlign:'center',fontSize:14,fontWeight:700}}>{t('profile.requestSent')}</div>
            ):(
              <div className="map-cta">
                <button onClick={()=>contact(selected,'call')} className="btn-ghost map-cta-btn">{t('map2.contact')}</button>
                <button onClick={()=>contact(selected,'message')} className="btn-primary map-cta-btn">{t('map2.book')}</button>
              </div>
            )}
            <a href={`/artisan/${selected.id}`} className="map-profile-link">{t('map2.profile')}</a>
          </div>
        ):(
          <>
            <div className="map-sheet-head">
              <div style={{minWidth:0}}>
                <div style={{fontSize:17,fontWeight:800,color:'var(--tx)'}}>
                  {loading?<span className="skeleton" style={{display:'inline-block',width:110,height:16,verticalAlign:'middle'}}/>
                    :<><span className="num">{count}</span> {count>1?t('map2.many'):t('map2.one')}{cat?<span style={{color:categoryInk(cat)}}> · {cl(cat)}</span>:''}</>}
                </div>
                <div style={{fontSize:12.5,color:'var(--tx2)'}}>{t('map2.nearby')}</div>
              </div>
              <button onClick={()=>setSheetFull(!sheetFull)} aria-label={sheetFull?t('map2.collapse'):t('map2.expand')} className="icon-btn map-toggle" style={{margin:0}}>
                {sheetFull?<ChevronDown size={22}/>:<ChevronUp size={22}/>}
              </button>
            </div>

            <div className="map-sheet-body">
              {loading?(
                <div aria-busy="true" style={{display:'flex',flexDirection:'column',gap:4}}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 8px'}}>
                      <div className="skeleton" style={{width:48,height:48,borderRadius:12,flexShrink:0}}/>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}><div className="skeleton" style={{width:'50%',height:12}}/><div className="skeleton" style={{width:'70%',height:10}}/></div>
                      <div className="skeleton" style={{width:52,height:18}}/>
                    </div>
                  ))}
                </div>
              ):loadFailed?(
                <div className="empty-state" style={{padding:'12px 12px 8px'}}>
                  <div className="empty-title" style={{fontSize:15}}>{t('map2.loadErr')}</div>
                  <div className="empty-sub">{t('map2.loadErrSub')}</div>
                  <button type="button" className="btn-primary" style={{marginTop:8}} onClick={()=>loadArtisans()}>{t('map2.retry')}</button>
                </div>
              ):count===0?(
                search||cat?(
                  <div className="empty-state" style={{padding:'12px 12px 8px'}}>
                    <div className="empty-title" style={{fontSize:15}}>{t('map2.none')}</div>
                    <div className="empty-sub">{t('map2.noneSub')}</div>
                    <button type="button" className="btn-ghost" style={{marginTop:8}} onClick={()=>{setSearch('');setCat('')}}>{t('map2.reset')}</button>
                  </div>
                ):(
                  <div className="empty-state" style={{padding:'4px 12px 8px'}}>
                    <EmptyArt/>
                    <div className="empty-title" style={{fontSize:15}}>{t('map2.emptyTitle')}</div>
                    <div className="empty-sub">{t('map2.emptySub')}</div>
                    <a href="/auth/signup?role=artisan" className="btn-primary" style={{marginTop:8}}>{t('map2.imArtisan')}</a>
                  </div>
                )
              ):(
                filtered.map(a=>{
                  const c=cc(a.category)
                  return(
                    <div key={a.id} className="arow" onClick={()=>pick(a)} {...pressable(()=>pick(a))}
                      style={{marginBottom:2}}>
                      <Avatar a={a} size={48}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:3,minWidth:0}}>
                          <span style={{fontSize:15,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.full_name}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',columnGap:6,rowGap:2,fontSize:12.5,color:'var(--tx2)'}}>
                          <span aria-hidden style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
                          <span style={{color:categoryInk(a.category),fontWeight:700}}>{cl(a.category)}</span>
                          <span aria-hidden style={{color:'var(--tx3)'}}>·</span>
                          <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="var(--star)"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg><span className="num" style={{color:'var(--laiton)',fontWeight:700,marginInlineStart:-3}}>{a.rating_avg.toFixed(1)}</span>
                          {a.distance_km!=null&&<><span aria-hidden style={{color:'var(--tx3)'}}>·</span><span className="num">{a.distance_km.toFixed(1)} km</span></>}
                        </div>
                      </div>
                      <div style={{textAlign:'end',flexShrink:0}}>
                        <div className="num" style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{a.hourly_rate.toLocaleString('fr-DZ')} <span style={{fontSize:11,color:'var(--tx3)',fontWeight:500}}>{t('common.da')}</span></div>
                        {a.is_available&&<div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',marginTop:3}}>
                          <span aria-hidden className="map-dot" style={{background:'var(--success)'}}/>
                          <span style={{fontSize:11.5,color:'var(--success)',fontWeight:600}}>{t('map2.available')}</span>
                        </div>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </section>

      {booking&&user&&selected&&(
        <BookingFlow
          artisan={{id:selected.id,name:selected.full_name,category:selected.category,hourlyRate:selected.hourly_rate||0,color:cc(selected.category)}}
          clientId={user.id}
          onClose={()=>setBooking(false)}
        />
      )}
    </div>
  )
}
