'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { SkeletonPage } from '@/components/Skeleton'
import { isPremium } from '@/lib/subscription'
import { Lock } from 'lucide-react'

export default function RevenusPage(){
  const router=useRouter()
  const { t, isAr } = useLang()
  const [user,setUser]=useState<any>(null)
  const [bookings,setBookings]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [premium,setPremium]=useState(false)
  const [period,setPeriod]=useState<'week'|'month'|'all'>('month')

  useEffect(()=>{load()},[])
  const load=async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u){router.push('/auth/login');return};setUser(u)
    const[{data},{data:art}]=await Promise.all([
      supabase.from('bookings').select('id,title,status,price_agreed,created_at,profiles!bookings_client_id_fkey(full_name)').eq('artisan_id',u.id).order('created_at',{ascending:false}).limit(100),
      supabase.from('artisans').select('plan,plan_until').eq('id',u.id).single(),
    ])
    if(data)setBookings(data)
    setPremium(isPremium(art))
    setLoading(false)
  }

  const now=Date.now()
  const filtered=bookings.filter(b=>{
    if(period==='all')return true
    const d=now-new Date(b.created_at).getTime()
    return period==='week'?d<7*86400000:d<30*86400000
  })
  const completed=filtered.filter(b=>b.status==='completed')
  const totalRev=completed.reduce((s:number,b:any)=>s+(b.price_agreed||0),0)
  const avgRev=completed.length>0?Math.round(totalRev/completed.length):0

  // Weekly chart data (last 8 weeks)
  const weekData=Array.from({length:8},(_,i)=>{
    const weekStart=now-(7-i)*7*86400000
    const weekEnd=weekStart+7*86400000
    const rev=bookings.filter(b=>b.status==='completed'&&new Date(b.created_at).getTime()>=weekStart&&new Date(b.created_at).getTime()<weekEnd).reduce((s:number,b:any)=>s+(b.price_agreed||0),0)
    return{label:`${t('revenus.weekPrefix')}${i+1}`,value:rev}
  })
  const maxWeek=Math.max(...weekData.map(w=>w.value),1)

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/86400000);return x===0?"Aujourd'hui":x===1?'Hier':x<7?`${x}j`:x<30?`${Math.floor(x/7)} sem.`:`${Math.floor(x/30)} mois`}

  if(loading)return<SkeletonPage stats rows={5}/>

  const statusLabel=(s:string)=>({completed:t('dashExtra.statusDone'),confirmed:t('dashExtra.statusConfirmed'),pending:t('dashExtra.statusPending'),refused:t('dashExtra.statusRefused')}[s]||t('dashExtra.statusCancelled'))

  return(
    <div style={{minHeight:'100vh',paddingTop:64,fontFamily:'Nexa,system-ui,sans-serif',direction:isAr?'rtl':'ltr'}}>
      <div style={{maxWidth:900,margin:'0 auto',padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
          <div><h1 style={{fontSize:26,fontWeight:800,color:'var(--tx)'}}>{t('revenus.title')}</h1><p style={{fontSize:13,color:'var(--tx2)',fontWeight:300}}>{t('revenus.subtitle')}</p></div>
          <div style={{display:'flex',gap:4}}>
            {(['week','month','all'] as const).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} className={period===p?'chip chip-active':'chip'}>
                {p==='week'?t('revenus.week'):p==='month'?t('revenus.month'):t('revenus.all')}
              </button>
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          <div className="card" style={{padding:'20px'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,marginBottom:8}}>{t('revenus.totalRevenue')}</div>
            <div style={{fontSize:28,fontWeight:800,color:'#10b981'}}>{totalRev.toLocaleString('fr-DZ')} DA</div>
          </div>
          <div className="card" style={{padding:'20px'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,marginBottom:8}}>{t('revenus.missions')}</div>
            <div style={{fontSize:28,fontWeight:800,color:'#5A3DF0'}}>{completed.length}</div>
          </div>
          <div className="card" style={{padding:'20px'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,marginBottom:8}}>{t('revenus.avgBasket')}</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--tx)'}}>{avgRev.toLocaleString('fr-DZ')} DA</div>
          </div>
        </div>

        {/* Chart — statistiques détaillées réservées Premium */}
        {premium?(
        <div className="card" style={{padding:'24px',marginBottom:24}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:20}}>{t('revenus.chartTitle')}</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140}}>
            {weekData.map((w,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div style={{fontSize:10,color:'var(--tx3)',fontWeight:300}}>{w.value>0?`${(w.value/1000).toFixed(0)}k`:''}</div>
                <div style={{width:'100%',background:`linear-gradient(180deg,#5A3DF0,#7C5CFF)`,borderRadius:'6px 6px 0 0',height:`${Math.max((w.value/maxWeek)*100,4)}%`,minHeight:4,transition:'height 0.5s ease',opacity:w.value>0?1:0.2}}/>
                <div style={{fontSize:10,color:'var(--tx3)'}}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>
        ):(
        <div className="card" style={{padding:'32px 24px',marginBottom:24,textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'center',color:'#5A3DF0',marginBottom:12}}><Lock size={26}/></div>
          <div style={{fontSize:15,fontWeight:800,color:'var(--tx)',marginBottom:6}}>{t('revenus.premiumTitle')}</div>
          <p style={{fontSize:13,color:'var(--tx2)',fontWeight:300,lineHeight:1.6,maxWidth:380,margin:'0 auto 18px'}}>
            {t('revenus.premiumDesc')} <strong style={{color:'var(--tx)'}}>Premium</strong>.
          </p>
          <button onClick={()=>router.push('/artisan-dashboard/abonnement')} className="btn-primary" style={{padding:'10px 22px'}}>{t('revenus.premiumCta')}</button>
        </div>
        )}

        {/* Mission history */}
        <div>
          <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)',marginBottom:14}}>{t('revenus.historyTitle')} ({filtered.length})</h2>
          {filtered.length===0?(
            <div className="card" style={{padding:'40px',textAlign:'center'}}><p style={{color:'var(--tx3)',fontSize:14}}>{t('revenus.noMissions')}</p></div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.map(b=>(
                <div key={b.id} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:b.status==='completed'?'#10b981':b.status==='confirmed'?'#5A3DF0':b.status==='pending'?'#f59e0b':'#ef4444',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{b.profiles?.full_name||t('revenus.clientFallback')}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{b.title||t('revenus.missionFallback')} · {timeAgo(b.created_at)}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:b.status==='completed'?'#10b981':'var(--tx)'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} DA</div>
                  <span style={{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,background:b.status==='completed'?'#10b98112':b.status==='confirmed'?'#5A3DF012':b.status==='pending'?'#f59e0b12':'#ef444412',color:b.status==='completed'?'#10b981':b.status==='confirmed'?'#5A3DF0':b.status==='pending'?'#f59e0b':'#ef4444'}}>{statusLabel(b.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
