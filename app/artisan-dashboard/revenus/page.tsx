'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RevenusPage(){
  const router=useRouter()
  const [user,setUser]=useState<any>(null)
  const [bookings,setBookings]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [period,setPeriod]=useState<'week'|'month'|'all'>('month')

  useEffect(()=>{load()},[])
  const load=async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u){router.push('/auth/login');return};setUser(u)
    const{data}=await supabase.from('bookings').select('id,title,status,price_agreed,created_at,profiles!bookings_client_id_fkey(full_name)').eq('artisan_id',u.id).order('created_at',{ascending:false}).limit(100)
    if(data)setBookings(data);setLoading(false)
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
    return{label:`S${i+1}`,value:rev}
  })
  const maxWeek=Math.max(...weekData.map(w=>w.value),1)

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/86400000);return x===0?"Aujourd'hui":x===1?'Hier':x<7?`${x}j`:x<30?`${Math.floor(x/7)} sem.`:`${Math.floor(x/30)} mois`}

  if(loading)return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><p style={{color:'var(--tx3)'}}>Chargement...</p></div>

  return(
    <div style={{minHeight:'100vh',paddingTop:64,fontFamily:'Nexa,system-ui,sans-serif'}}>
      <div style={{maxWidth:900,margin:'0 auto',padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
          <div><h1 style={{fontSize:26,fontWeight:800,color:'var(--tx)'}}>Revenus & Historique</h1><p style={{fontSize:13,color:'var(--tx2)',fontWeight:300}}>Suivez votre activité</p></div>
          <div style={{display:'flex',gap:4}}>
            {(['week','month','all'] as const).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} style={{padding:'8px 16px',borderRadius:10,border:'1px solid var(--border)',background:period===p?'#6366f112':'transparent',color:period===p?'#6366f1':'var(--tx3)',fontSize:12,fontWeight:period===p?700:300,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>
                {p==='week'?'7 jours':p==='month'?'30 jours':'Tout'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'20px',boxShadow:'var(--card-shadow)'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,marginBottom:8}}>REVENUS TOTAL</div>
            <div style={{fontSize:28,fontWeight:800,color:'#10b981'}}>{totalRev.toLocaleString('fr-DZ')} DA</div>
          </div>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'20px',boxShadow:'var(--card-shadow)'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,marginBottom:8}}>MISSIONS</div>
            <div style={{fontSize:28,fontWeight:800,color:'#6366f1'}}>{completed.length}</div>
          </div>
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'20px',boxShadow:'var(--card-shadow)'}}>
            <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,marginBottom:8}}>PANIER MOYEN</div>
            <div style={{fontSize:28,fontWeight:800,color:'var(--tx)'}}>{avgRev.toLocaleString('fr-DZ')} DA</div>
          </div>
        </div>

        {/* Chart */}
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,padding:'24px',marginBottom:24,boxShadow:'var(--card-shadow)'}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:20}}>Revenus par semaine</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140}}>
            {weekData.map((w,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div style={{fontSize:10,color:'var(--tx3)',fontWeight:300}}>{w.value>0?`${(w.value/1000).toFixed(0)}k`:''}</div>
                <div style={{width:'100%',background:`linear-gradient(180deg,#6366f1,#8b5cf6)`,borderRadius:'6px 6px 0 0',height:`${Math.max((w.value/maxWeek)*100,4)}%`,minHeight:4,transition:'height 0.5s ease',opacity:w.value>0?1:0.2}}/>
                <div style={{fontSize:10,color:'var(--tx3)'}}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission history */}
        <div>
          <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)',marginBottom:14}}>Historique des missions ({filtered.length})</h2>
          {filtered.length===0?(
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'40px',textAlign:'center'}}><p style={{color:'var(--tx3)',fontSize:14}}>Aucune mission sur cette période</p></div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.map(b=>(
                <div key={b.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'var(--card-shadow)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:b.status==='completed'?'#10b981':b.status==='confirmed'?'#6366f1':b.status==='pending'?'#f59e0b':'#ef4444',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{b.profiles?.full_name||'Client'}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{b.title||'Mission'} · {timeAgo(b.created_at)}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:b.status==='completed'?'#10b981':'var(--tx)'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} DA</div>
                  <span style={{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,background:b.status==='completed'?'#10b98112':b.status==='confirmed'?'#6366f112':b.status==='pending'?'#f59e0b12':'#ef444412',color:b.status==='completed'?'#10b981':b.status==='confirmed'?'#6366f1':b.status==='pending'?'#f59e0b':'#ef4444'}}>{b.status==='completed'?'Terminé':b.status==='confirmed'?'Confirmé':b.status==='pending'?'En attente':'Annulé'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
