'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Clock, CheckCircle2, Star, Layers, Search, ClipboardList, Map, CalendarPlus } from 'lucide-react'
import { useLang } from '@/lib/LangContext'

// Couleur d'un statut (tokens) + pastille teintée lisible en clair comme en sombre.
const STATUS_TONE:Record<string,string>={pending:'var(--warning)',confirmed:'var(--accent)',in_progress:'var(--accent)',completed:'var(--success)',refused:'var(--danger)',cancelled:'var(--tx2)'}
const tone=(c:string):React.CSSProperties=>({background:`color-mix(in srgb, ${c} 13%, transparent)`,color:`color-mix(in srgb, ${c} 72%, var(--tx))`})
const SCOPE_CSS=`.me-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

export default function ClientDashboard(){
  const router=useRouter()
  const { t, isAr }=useLang()
  const [user,setUser]=useState<any>(null)
  const [profile,setProfile]=useState<any>(null)
  const [bookings,setBookings]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{load()},[])
  const load=async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u){router.push('/auth/login?next='+encodeURIComponent(window.location.pathname));return};setUser(u)
    const[{data:p},{data:bk}]=await Promise.all([
      supabase.from('profiles').select('*').eq('id',u.id).single(),
      supabase.from('bookings').select('*').eq('client_id',u.id).order('created_at',{ascending:false}).limit(20),
    ])
    if(p)setProfile(p)
    // Nom de l'artisan via profiles (l'embed par FK pointait vers la mauvaise table).
    const list=bk||[]
    const ids=Array.from(new Set(list.map((x:any)=>x.artisan_id).filter(Boolean)))
    const nameById:Record<string,string>={}
    if(ids.length){
      const{data:profs}=await supabase.from('profiles').select('id,full_name').in('id',ids)
      for(const pr of (profs||[]) as any[])nameById[pr.id]=pr.full_name
    }
    setBookings(list.map((x:any)=>({...x,artisans:{profiles:{full_name:nameById[x.artisan_id]||'Artisan'}}})))
    setLoading(false)
  }

  const pending=bookings.filter(b=>b.status==='pending')
  const confirmed=bookings.filter(b=>b.status==='confirmed')
  const completed=bookings.filter(b=>b.status==='completed')
  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/60000);return x<1?t('common.justNow'):x<60?`${x} ${t('common.minShort')}`:x<1440?`${Math.floor(x/60)}${t('common.hourShort')}`:`${Math.floor(x/1440)}${t('common.daysShort')}`}

  if(loading)return<div role="status" aria-label={t('common.loading')} style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  return(
    <div className="me-scope" style={{minHeight:'100vh',paddingTop:64,direction:isAr?'rtl':'ltr'}}>
      <style>{SCOPE_CSS}</style>
      <div className="page-pad-m" style={{maxWidth:900,margin:'0 auto',padding:'28px 24px 48px'}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:'clamp(24px,6vw,30px)',lineHeight:1.15,fontWeight:800,color:'var(--tx)',marginBottom:6}}>{t('mySpace.hello')} {profile?.full_name?.split(' ')[0]||'!'}</h1>
          <p style={{fontSize:14,color:'var(--tx2)'}}>{t('mySpace.helloSub')}</p>
        </div>

        {/* KPIs */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:28}}>
          {[
            {label:t('mySpace.pending'),value:pending.length,color:'var(--warning)',Icon:Clock},
            {label:t('mySpace.confirmed'),value:confirmed.length,color:'var(--accent)',Icon:CheckCircle2},
            {label:t('mySpace.completed'),value:completed.length,color:'var(--success)',Icon:Star},
            {label:'Total',value:bookings.length,color:'var(--tx2)',Icon:Layers},
          ].map(k=>(
            <div key={k.label} className="card" style={{padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:10}}>
                <span style={{fontSize:11.5,color:'var(--tx2)',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase'}}>{k.label}</span>
                <span aria-hidden style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,...tone(k.color)}}><k.Icon size={15}/></span>
              </div>
              <div className="num" style={{fontSize:28,lineHeight:1,fontWeight:800,color:'var(--tx)'}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* En attente */}
        {pending.length>0&&(
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:19,fontWeight:800,color:'var(--tx)',marginBottom:14}}>{t('mySpace.pendingResponse')} <span className="num" style={{color:'var(--tx2)',fontWeight:600}}>({pending.length})</span></h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {pending.map(b=>{
                const art=b.artisans;const name=art?.profiles?.full_name||'Artisan'
                return(
                  <div key={b.id} className="card" style={{borderColor:'color-mix(in srgb, var(--warning) 45%, var(--border))',padding:'16px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                    <div aria-hidden style={{width:40,height:40,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,...tone('var(--warning)')}}><Clock size={18}/></div>
                    <div style={{flex:1,minWidth:160}}>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{name}</div>
                      <div style={{fontSize:13,color:'var(--tx2)',marginTop:2}}>{b.title||t('mySpace.request')} · {timeAgo(b.created_at)}</div>
                    </div>
                    <Link href={`/chat/${b.id}`} className="btn-primary btn-sm" style={{minHeight:44}}>{t('mySpace.message')}</Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Récentes */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10}}>
            <h2 style={{fontSize:19,fontWeight:800,color:'var(--tx)'}}>{t('nav.myBookings')}</h2>
            <Link href="/mon-espace/reservations" style={{fontSize:13,color:'var(--accent)',textDecoration:'none',fontWeight:700,padding:'12px 4px'}}>{t('mySpace.seeAll')}</Link>
          </div>
          {bookings.length===0?(
            <div className="card" style={{padding:'40px 24px',textAlign:'center'}}>
              <div aria-hidden style={{width:52,height:52,borderRadius:14,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',...tone('var(--accent)')}}><CalendarPlus size={24}/></div>
              <p style={{fontSize:15,fontWeight:600,color:'var(--tx)',marginBottom:16}}>{t('mySpace.noBookingYet')}</p>
              <Link href="/" className="btn-primary" style={{minHeight:44}}>{t('mySpace.findArtisan')}</Link>
            </div>
          ):(
            <div className="stagger" style={{display:'flex',flexDirection:'column',gap:8}}>
              {bookings.slice(0,8).map(b=>{
                const art=b.artisans;const name=art?.profiles?.full_name||'Artisan'
                const sc=STATUS_TONE[b.status]||'var(--danger)'
                const sl=t(`status.${b.status}`)
                return(
                  <Link key={b.id} href={`/chat/${b.id}`} className="card is-clickable" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12,textDecoration:'none',minHeight:64}}>
                    <div aria-hidden style={{width:8,height:8,borderRadius:'50%',background:sc,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
                      <div style={{fontSize:12.5,color:'var(--tx2)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title||t('mySpace.booking')} · {timeAgo(b.created_at)}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                      <div className="num" style={{fontSize:14,fontWeight:700,color:'var(--tx)',whiteSpace:'nowrap'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} {t('common.da')}</div>
                      <span style={{padding:'3px 9px',borderRadius:'var(--r-chip)',fontSize:11,fontWeight:700,whiteSpace:'nowrap',...tone(sc)}}>{sl}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
          {[{label:t('mySpace.findArtisan'),href:'/',Icon:Search,desc:t('mySpace.quickSearchDesc')},{label:t('nav.myBookings'),href:'/mon-espace/reservations',Icon:ClipboardList,desc:t('mySpace.fullHistory')},{label:t('mySpace.myReviews'),href:'/mon-espace/avis',Icon:Star,desc:t('mySpace.myReviewsDesc')},{label:t('nav.map'),href:'/map',Icon:Map,desc:t('mySpace.aroundMe')}].map(l=>(
            <Link key={l.label} href={l.href} className="acard" style={{padding:'16px',textDecoration:'none',display:'block'}}>
              <div aria-hidden style={{marginBottom:10}}><l.Icon size={22} color="var(--accent)"/></div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:3}}>{l.label}</div>
              <div style={{fontSize:12.5,color:'var(--tx2)',lineHeight:1.4}}>{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
