'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Clock, CheckCircle2, Star, Layers, Search, ClipboardList, Map } from 'lucide-react'
import { useLang } from '@/lib/LangContext'

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
    if(!u){router.push('/auth/login');return};setUser(u)
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

  if(loading)return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  return(
    <div style={{minHeight:'100vh',paddingTop:64,fontFamily:'Nexa,system-ui,sans-serif',direction:isAr?'rtl':'ltr'}}>
      <div style={{maxWidth:900,margin:'0 auto',padding:24}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:28,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{t('mySpace.hello')} {profile?.full_name?.split(' ')[0]||'!'}</h1>
          <p style={{fontSize:13,color:'var(--tx2)',fontWeight:300}}>{t('mySpace.helloSub')}</p>
        </div>

        {/* KPIs */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:24}}>
          {[
            {label:t('mySpace.pending'),value:pending.length,color:'#f59e0b',Icon:Clock},
            {label:t('mySpace.confirmed'),value:confirmed.length,color:'#6366f1',Icon:CheckCircle2},
            {label:t('mySpace.completed'),value:completed.length,color:'#10b981',Icon:Star},
            {label:'Total',value:bookings.length,color:'var(--tx)',Icon:Layers},
          ].map(k=>(
            <div key={k.label} className="card" style={{padding:'18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700}}>{k.label.toUpperCase()}</span>
                <k.Icon size={16} color={k.color}/>
              </div>
              <div style={{fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* En attente */}
        {pending.length>0&&(
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)',marginBottom:14}}>{t('mySpace.pendingResponse')} ({pending.length})</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {pending.map(b=>{
                const art=b.artisans;const name=art?.profiles?.full_name||'Artisan'
                return(
                  <div key={b.id} className="card" style={{borderColor:'#f59e0b55',padding:'16px 20px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:'#f59e0b15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Clock size={18} color="#f59e0b"/></div>
                    <div style={{flex:1,minWidth:160}}>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{name}</div>
                      <div style={{fontSize:12,color:'var(--tx2)',fontWeight:300}}>{b.title||t('mySpace.request')} · {timeAgo(b.created_at)}</div>
                    </div>
                    <a href={`/chat/${b.id}`}><button className="btn-primary btn-sm">{t('mySpace.message')}</button></a>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Récentes */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{t('nav.myBookings')}</h2>
            <a href="/mon-espace/reservations" style={{fontSize:12,color:'#6366f1',textDecoration:'none',fontWeight:700}}>{t('mySpace.seeAll')}</a>
          </div>
          {bookings.length===0?(
            <div className="card" style={{padding:'48px',textAlign:'center'}}>
              <p style={{fontSize:14,color:'var(--tx3)',marginBottom:12}}>{t('mySpace.noBookingYet')}</p>
              <a href="/"><button className="btn-primary btn-sm">{t('mySpace.findArtisan')}</button></a>
            </div>
          ):(
            <div className="stagger" style={{display:'flex',flexDirection:'column',gap:8}}>
              {bookings.slice(0,8).map(b=>{
                const art=b.artisans;const name=art?.profiles?.full_name||'Artisan'
                const sc=b.status==='completed'?'#10b981':b.status==='confirmed'?'#6366f1':b.status==='pending'?'#f59e0b':'#ef4444'
                const sl=t(`status.${b.status}`)
                return(
                  <div key={b.id} className="card is-clickable" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14}} onClick={()=>router.push(`/chat/${b.id}`)}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:sc,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{name}</div>
                      <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{b.title||t('mySpace.booking')} · {timeAgo(b.created_at)}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} {t('common.da')}</div>
                    <span style={{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,background:sc+'12',color:sc}}>{sl}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
          {[{label:t('mySpace.findArtisan'),href:'/',Icon:Search,desc:t('mySpace.quickSearchDesc')},{label:t('nav.myBookings'),href:'/mon-espace/reservations',Icon:ClipboardList,desc:t('mySpace.fullHistory')},{label:t('mySpace.myReviews'),href:'/mon-espace/avis',Icon:Star,desc:t('mySpace.myReviewsDesc')},{label:t('nav.map'),href:'/map',Icon:Map,desc:t('mySpace.aroundMe')}].map(l=>(
            <a key={l.label} href={l.href} style={{textDecoration:'none'}}>
              <div className="acard" style={{padding:'18px'}}>
                <div style={{marginBottom:10}}><l.Icon size={22} color="var(--accent)"/></div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:2}}>{l.label}</div>
                <div style={{fontSize:12,color:'var(--tx3)',fontWeight:300}}>{l.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
