'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { SkeletonPage } from '@/components/Skeleton'
import { isPremium } from '@/lib/subscription'
import { Lock } from 'lucide-react'

const STATUS_TONE:Record<string,string>={pending:'var(--warning)',confirmed:'var(--accent)',in_progress:'var(--accent)',completed:'var(--success)',refused:'var(--danger)',cancelled:'var(--tx2)'}
const tone=(c:string):React.CSSProperties=>({background:`color-mix(in srgb, ${c} 13%, transparent)`,color:`color-mix(in srgb, ${c} 72%, var(--tx))`})
const SCOPE_CSS=`.rev-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`
const KPI_LBL:React.CSSProperties={fontSize:11.5,color:'var(--tx2)',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:10}
const KPI_VAL:React.CSSProperties={fontSize:'clamp(22px,6vw,28px)',lineHeight:1.1,fontWeight:800,color:'var(--tx)',whiteSpace:'nowrap'}

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

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/86400000);return x===0?t('common.today'):x===1?t('common.yesterday'):x<7?`${x}${t('common.daysShort')}`:x<30?`${Math.floor(x/7)} ${isAr?'أسبوع':'sem.'}`:`${Math.floor(x/30)} ${isAr?'شهر':'mois'}`}

  if(loading)return<SkeletonPage stats rows={5}/>

  const statusLabel=(s:string)=>({completed:t('dashExtra.statusDone'),confirmed:t('dashExtra.statusConfirmed'),pending:t('dashExtra.statusPending'),refused:t('dashExtra.statusRefused')}[s]||t('dashExtra.statusCancelled'))

  return(
    <div className="rev-scope" style={{minHeight:'100vh',paddingTop:64,direction:isAr?'rtl':'ltr'}}>
      <style>{SCOPE_CSS}</style>
      <div className="page-pad-m" style={{maxWidth:900,margin:'0 auto',padding:'28px 24px 48px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
          <div><h1 style={{fontSize:'clamp(24px,6vw,30px)',lineHeight:1.15,fontWeight:800,color:'var(--tx)',marginBottom:6}}>{t('revenus.title')}</h1><p style={{fontSize:14,color:'var(--tx2)'}}>{t('revenus.subtitle')}</p></div>
          <div role="group" aria-label={t('revenus.title')} style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {(['week','month','all'] as const).map(p=>(
              <button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)} className={period===p?'chip chip-active':'chip'} style={{minHeight:44}}>
                {p==='week'?t('revenus.week'):p==='month'?t('revenus.month'):t('revenus.all')}
              </button>
            ))}
          </div>
        </div>

        {/* KPI row */}
        {/* auto-fit : 3 colonnes sur desktop, 1-2 sur mobile (avant : 3 colonnes fixes qui débordaient à 390px) */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:24}}>
          <div className="card" style={{padding:'16px 18px',borderInlineStart:'3px solid var(--success)'}}>
            <div style={KPI_LBL}>{t('revenus.totalRevenue')}</div>
            <div className="num" style={KPI_VAL}>{totalRev.toLocaleString('fr-DZ')} DA</div>
          </div>
          <div className="card" style={{padding:'16px 18px',borderInlineStart:'3px solid var(--accent)'}}>
            <div style={KPI_LBL}>{t('revenus.missions')}</div>
            <div className="num" style={KPI_VAL}>{completed.length}</div>
          </div>
          <div className="card" style={{padding:'16px 18px',borderInlineStart:'3px solid var(--laiton)'}}>
            <div style={KPI_LBL}>{t('revenus.avgBasket')}</div>
            <div className="num" style={KPI_VAL}>{avgRev.toLocaleString('fr-DZ')} DA</div>
          </div>
        </div>

        {/* Chart — statistiques détaillées réservées Premium */}
        {premium?(
        <div className="card" style={{padding:'24px',marginBottom:24}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'var(--tx)',marginBottom:20}}>{t('revenus.chartTitle')}</h2>
          <div role="img" aria-label={`${t('revenus.chartTitle')} : ${weekData.map(w=>`${w.label} ${w.value.toLocaleString('fr-DZ')} DA`).join(', ')}`} style={{display:'flex',alignItems:'flex-end',gap:'clamp(4px,1.5vw,8px)',height:150}}>
            {weekData.map((w,i)=>(
              <div key={i} title={`${w.label} · ${w.value.toLocaleString('fr-DZ')} DA`} style={{flex:1,minWidth:0,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div className="num" style={{fontSize:11,color:'var(--tx2)',minHeight:14}}>{w.value>0?`${(w.value/1000).toFixed(0)}k`:''}</div>
                <div style={{flex:1,minHeight:0,width:'100%',display:'flex',alignItems:'flex-end'}}>
                  <div style={{width:'100%',background:'var(--accent)',borderRadius:'5px 5px 0 0',height:`${Math.max((w.value/maxWeek)*100,4)}%`,minHeight:4,transition:'height 0.5s ease',opacity:w.value>0?1:0.25}}/>
                </div>
                <div className="num" style={{fontSize:11,color:'var(--tx2)'}}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>
        ):(
        <div className="card" style={{padding:'32px 24px',marginBottom:24,textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div aria-hidden style={{width:52,height:52,borderRadius:14,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',...tone('var(--accent)')}}><Lock size={24}/></div>
          <div style={{fontSize:15,fontWeight:800,color:'var(--tx)',marginBottom:6}}>{t('revenus.premiumTitle')}</div>
          <p style={{fontSize:14,color:'var(--tx2)',lineHeight:1.6,maxWidth:380,margin:'0 auto 18px'}}>
            {t('revenus.premiumDesc')} <strong style={{color:'var(--tx)'}}>Premium</strong>.
          </p>
          <button onClick={()=>router.push('/artisan-dashboard/abonnement')} className="btn-primary" style={{minHeight:44}}>{t('revenus.premiumCta')}</button>
        </div>
        )}

        {/* Mission history */}
        <div>
          <h2 style={{fontSize:19,fontWeight:800,color:'var(--tx)',marginBottom:14}}>{t('revenus.historyTitle')} <span className="num" style={{color:'var(--tx2)',fontWeight:600}}>({filtered.length})</span></h2>
          {filtered.length===0?(
            <div className="card" style={{padding:'36px 24px',textAlign:'center'}}><p style={{color:'var(--tx2)',fontSize:15}}>{t('revenus.noMissions')}</p></div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.map(b=>{
                const sc=STATUS_TONE[b.status]||'var(--danger)'
                return(
                <div key={b.id} className="card" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                  <div aria-hidden style={{width:8,height:8,borderRadius:'50%',background:sc,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.profiles?.full_name||t('revenus.clientFallback')}</div>
                    <div style={{fontSize:12.5,color:'var(--tx2)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title||t('revenus.missionFallback')} · {timeAgo(b.created_at)}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                    <div className="num" style={{fontSize:14,fontWeight:700,color:'var(--tx)',whiteSpace:'nowrap'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} DA</div>
                    <span style={{padding:'3px 9px',borderRadius:'var(--r-chip)',fontSize:11,fontWeight:700,whiteSpace:'nowrap',...tone(sc)}}>{statusLabel(b.status)}</span>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
