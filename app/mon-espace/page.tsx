'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Clock, CheckCircle2, Star, Layers, Search, ClipboardList, Map } from 'lucide-react'

export default function ClientDashboard(){
  const router=useRouter()
  const [user,setUser]=useState<any>(null)
  const [profile,setProfile]=useState<any>(null)
  const [bookings,setBookings]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{load()},[])
  const load=async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u){router.push('/auth/login');return};setUser(u)
    const[{data:p},{data:b}]=await Promise.all([
      supabase.from('profiles').select('*').eq('id',u.id).single(),
      supabase.from('bookings').select('*,artisans!bookings_artisan_id_fkey(category,profiles!inner(full_name,avatar_url))').eq('client_id',u.id).order('created_at',{ascending:false}).limit(20),
    ])
    if(p)setProfile(p);if(b)setBookings(b);setLoading(false)
  }

  const pending=bookings.filter(b=>b.status==='pending')
  const confirmed=bookings.filter(b=>b.status==='confirmed')
  const completed=bookings.filter(b=>b.status==='completed')
  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/60000);return x<1?'À l\'instant':x<60?`${x} min`:x<1440?`${Math.floor(x/60)}h`:`${Math.floor(x/1440)}j`}

  if(loading)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingTop:64,fontFamily:'Nexa,system-ui,sans-serif'}}>
      <div style={{maxWidth:900,margin:'0 auto',padding:24}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:28,fontWeight:800,color:'var(--tx)',marginBottom:4}}>Bonjour {profile?.full_name?.split(' ')[0]||'!'}</h1>
          <p style={{fontSize:13,color:'var(--tx2)',fontWeight:300}}>Gérez vos réservations et retrouvez vos artisans</p>
        </div>

        {/* KPIs */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:24}}>
          {[
            {label:'En attente',value:pending.length,color:'#f59e0b',Icon:Clock},
            {label:'Confirmées',value:confirmed.length,color:'#6366f1',Icon:CheckCircle2},
            {label:'Terminées',value:completed.length,color:'#10b981',Icon:Star},
            {label:'Total',value:bookings.length,color:'var(--tx)',Icon:Layers},
          ].map(k=>(
            <div key={k.label} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'18px',boxShadow:'var(--card-shadow)'}}>
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
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)',marginBottom:14}}>En attente de réponse ({pending.length})</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {pending.map(b=>{
                const art=b.artisans;const name=art?.profiles?.full_name||'Artisan'
                return(
                  <div key={b.id} style={{background:'var(--bg2)',border:'1px solid #f59e0b33',borderRadius:14,padding:'16px 20px',display:'flex',alignItems:'center',gap:14,boxShadow:'var(--card-shadow)',flexWrap:'wrap'}}>
                    <div style={{width:40,height:40,borderRadius:10,background:'#f59e0b15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Clock size={18} color="#f59e0b"/></div>
                    <div style={{flex:1,minWidth:160}}>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{name}</div>
                      <div style={{fontSize:12,color:'var(--tx2)',fontWeight:300}}>{b.title||'Demande'} · {timeAgo(b.created_at)}</div>
                    </div>
                    <a href={`/chat/${b.id}`}><button style={{padding:'8px 18px',borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>Message</button></a>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Récentes */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>Mes réservations</h2>
            <a href="/mon-espace/reservations" style={{fontSize:12,color:'#6366f1',textDecoration:'none',fontWeight:700}}>Voir tout</a>
          </div>
          {bookings.length===0?(
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'48px',textAlign:'center',boxShadow:'var(--card-shadow)'}}>
              <p style={{fontSize:14,color:'var(--tx3)',marginBottom:12}}>Aucune réservation pour l'instant</p>
              <a href="/"><button style={{padding:'10px 24px',borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>Trouver un artisan</button></a>
            </div>
          ):(
            <div className="stagger" style={{display:'flex',flexDirection:'column',gap:8}}>
              {bookings.slice(0,8).map(b=>{
                const art=b.artisans;const name=art?.profiles?.full_name||'Artisan'
                const sc=b.status==='completed'?'#10b981':b.status==='confirmed'?'#6366f1':b.status==='pending'?'#f59e0b':'#ef4444'
                const sl=b.status==='completed'?'Terminé':b.status==='confirmed'?'Confirmé':b.status==='pending'?'En attente':'Annulé'
                return(
                  <div key={b.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'var(--card-shadow)',cursor:'pointer'}} onClick={()=>router.push(`/chat/${b.id}`)}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:sc,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{name}</div>
                      <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{b.title||'Réservation'} · {timeAgo(b.created_at)}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} DA</div>
                    <span style={{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,background:sc+'12',color:sc}}>{sl}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
          {[{label:'Trouver un artisan',href:'/',Icon:Search,desc:'Rechercher un professionnel'},{label:'Mes réservations',href:'/mon-espace/reservations',Icon:ClipboardList,desc:'Historique complet'},{label:'Mes avis',href:'/mon-espace/avis',Icon:Star,desc:'Avis que j\'ai laissés'},{label:'Carte',href:'/map',Icon:Map,desc:'Artisans autour de moi'}].map(l=>(
            <a key={l.label} href={l.href} style={{textDecoration:'none'}}>
              <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'18px',cursor:'pointer',transition:'all 0.2s',boxShadow:'var(--card-shadow)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366f133';e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none'}}>
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
