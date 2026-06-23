'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { Wallet, CheckCircle2, Clock, Star, User, Calendar, BarChart3, Map } from 'lucide-react'

export default function ArtisanDashboard(){
  const router=useRouter();const{t,isAr}=useLang()
  const [user,setUser]=useState<any>(null)
  const [profile,setProfile]=useState<any>(null)
  const [artisan,setArtisan]=useState<any>(null)
  const [bookings,setBookings]=useState<any[]>([])
  const [stats,setStats]=useState({revenue:0,missions:0,pending:0,rating:0,ratingCount:0})
  const [loading,setLoading]=useState(true)
  const [isAvailable,setIsAvailable]=useState(false)
  const gpsRef=useRef<number|null>(null)

  useEffect(()=>{load()},[])

  const load=async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u){router.push('/auth/login');return}
    setUser(u)
    const[{data:p},{data:a},{data:b},{data:completed}]=await Promise.all([
      supabase.from('profiles').select('*').eq('id',u.id).single(),
      supabase.from('artisans').select('*').eq('id',u.id).single(),
      supabase.from('bookings').select('*,profiles!bookings_client_id_fkey(full_name,phone)').eq('artisan_id',u.id).order('created_at',{ascending:false}).limit(20),
      supabase.from('bookings').select('price_agreed').eq('artisan_id',u.id).eq('status','completed'),
    ])
    if(p)setProfile(p);if(a){setArtisan(a);setIsAvailable(a.is_available)}
    if(b)setBookings(b)
    const rev=(completed||[]).reduce((s:number,x:any)=>s+(x.price_agreed||0),0)
    const pending=(b||[]).filter((x:any)=>x.status==='pending').length
    setStats({revenue:rev,missions:(completed||[]).length,pending,rating:a?.rating_avg||0,ratingCount:a?.rating_count||0})
    setLoading(false)
  }

  const toggleAvail=async()=>{
    if(!user)return;const nv=!isAvailable;setIsAvailable(nv)
    if(nv&&navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async pos=>{
        await supabase.from('artisans').update({is_available:true,lat:pos.coords.latitude,lng:pos.coords.longitude}).eq('id',user.id)
      },()=>{supabase.from('artisans').update({is_available:true}).eq('id',user.id)})
      gpsRef.current=navigator.geolocation.watchPosition(async pos=>{
        await supabase.from('artisans').update({lat:pos.coords.latitude,lng:pos.coords.longitude}).eq('id',user.id)
      },()=>{},{enableHighAccuracy:true,maximumAge:10000})
    }else{
      if(gpsRef.current!==null){navigator.geolocation.clearWatch(gpsRef.current);gpsRef.current=null}
      await supabase.from('artisans').update({is_available:false}).eq('id',user.id)
    }
  }

  const respond=async(bookingId:string,accept:boolean)=>{
    await supabase.from('bookings').update({status:accept?'confirmed':'refused'}).eq('id',bookingId)
    const b=bookings.find(x=>x.id===bookingId)
    if(b)await supabase.from('notifications').insert({user_id:b.client_id,type:accept?'booking_confirmed':'booking_refused',title:accept?'Demande acceptée':'Demande refusée',message:`${profile?.full_name||'L\'artisan'} a ${accept?'accepté':'refusé'} votre demande.`})
    setBookings(prev=>prev.map(x=>x.id===bookingId?{...x,status:accept?'confirmed':'refused'}:x))
    if(accept)setStats(p=>({...p,pending:p.pending-1}))
  }

  // Complétion profil
  const completion=(()=>{
    if(!artisan||!profile)return 0;let s=0,t=7
    if(profile.full_name)s++;if(profile.avatar_url)s++;if(profile.phone)s++
    if(artisan.bio&&artisan.bio.length>10)s++;if(artisan.lat&&artisan.lng)s++
    if(artisan.hourly_rate>0)s++;if(artisan.category)s++
    return Math.round((s/t)*100)
  })()

  const missing=(()=>{
    if(!artisan||!profile)return[]
    const m:string[]=[]
    if(!profile.avatar_url)m.push('Ajouter une photo de profil')
    if(!artisan.bio||artisan.bio.length<10)m.push('Écrire une description')
    if(!artisan.lat||!artisan.lng)m.push('Ajouter votre adresse')
    if(!artisan.hourly_rate||artisan.hourly_rate===0)m.push('Définir votre tarif')
    return m
  })()

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/60000);return x<1?'À l\'instant':x<60?`${x} min`:x<1440?`${Math.floor(x/60)}h`:`${Math.floor(x/1440)}j`}

  const pendingBookings=bookings.filter(b=>b.status==='pending')
  const recentBookings=bookings.filter(b=>b.status!=='pending').slice(0,5)

  if(loading)return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  return(
    <div style={{minHeight:'100vh',paddingTop:64,fontFamily:'Nexa,system-ui,sans-serif'}}>
      <div style={{maxWidth:1000,margin:'0 auto',padding:'24px'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28,flexWrap:'wrap',gap:16}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:800,color:'var(--tx)',marginBottom:4}}>Bonjour {profile?.full_name?.split(' ')[0] || 'Artisan'}</h1>
            <p style={{fontSize:13,color:'var(--tx2)',fontWeight:300}}>Voici votre activité du jour</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            {/* Disponibilité toggle */}
            <button onClick={toggleAvail} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:12,border:'1px solid var(--border)',background:isAvailable?'#10b98112':'var(--bg2)',cursor:'pointer',fontFamily:'Nexa,sans-serif',transition:'all 0.2s'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:isAvailable?'#10b981':'var(--tx3)',boxShadow:isAvailable?'0 0 8px #10b98155':'none',transition:'all 0.3s'}}/>
              <span style={{fontSize:13,fontWeight:700,color:isAvailable?'#10b981':'var(--tx3)'}}>{isAvailable?'En ligne':'Hors ligne'}</span>
            </button>
            <a href="/artisan-dashboard/profil"><button className="btn-primary btn-sm">Mon profil</button></a>
          </div>
        </div>

        {/* Complétion profil */}
        {completion<100&&(
          <div className="card" style={{padding:'20px 24px',marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>Profil complété à {completion}%</span>
              <a href="/artisan-dashboard/profil" style={{fontSize:12,color:'#6366f1',textDecoration:'none',fontWeight:700}}>Compléter</a>
            </div>
            <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden',marginBottom:12}}>
              <div style={{height:'100%',width:`${completion}%`,background:'linear-gradient(90deg,#6366f1,#8b5cf6)',borderRadius:3,transition:'width 0.5s'}}/>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {missing.map(m=><span key={m} style={{padding:'4px 12px',borderRadius:8,background:'#f59e0b12',border:'1px solid #f59e0b22',fontSize:11,color:'#f59e0b'}}>{m}</span>)}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:24}}>
          {[
            {label:'Revenus',value:`${stats.revenue.toLocaleString('fr-DZ')} DA`,Icon:Wallet,color:'#10b981',sub:'Total encaissé'},
            {label:'Missions',value:stats.missions,Icon:CheckCircle2,color:'#6366f1',sub:'Terminées'},
            {label:'En attente',value:stats.pending,Icon:Clock,color:'#f59e0b',sub:'Demandes à traiter'},
            {label:'Note',value:stats.rating?`${stats.rating.toFixed(1)}/5`:'—',Icon:Star,color:'#f59e0b',sub:`${stats.ratingCount} avis`},
          ].map(k=>(
            <div key={k.label} className="card" style={{padding:'20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,letterSpacing:'0.06em'}}>{k.label.toUpperCase()}</span>
                <k.Icon size={18} color={k.color}/>
              </div>
              <div style={{fontSize:28,fontWeight:800,color:k.color,marginBottom:4}}>{k.value}</div>
              <div style={{fontSize:12,color:'var(--tx3)',fontWeight:300}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Demandes en attente — réponse rapide */}
        {pendingBookings.length>0&&(
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)',marginBottom:14}}>Demandes en attente ({pendingBookings.length})</h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {pendingBookings.map(b=>(
                <div key={b.id} className="card" style={{borderColor:'#f59e0b55',padding:'18px 20px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:'#f59e0b15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Clock size={18} color="#f59e0b"/></div>
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:2}}>{b.profiles?.full_name||'Client'}</div>
                    <div style={{fontSize:12,color:'var(--tx2)',fontWeight:300}}>{b.title||b.description||'Demande de service'}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>{timeAgo(b.created_at)} · {b.address||'Adresse non précisée'}</div>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--tx)',marginRight:8}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} DA</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>respond(b.id,true)} className="btn-success btn-sm">Accepter</button>
                    <button onClick={()=>respond(b.id,false)} className="btn-ghost btn-sm" style={{color:'#ef4444',borderColor:'#ef444455'}}>Refuser</button>
                    <a href={`/chat/${b.id}`}><button className="btn-ghost btn-sm">Message</button></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique récent */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>Historique récent</h2>
            <a href="/artisan-dashboard/revenus" style={{fontSize:12,color:'#6366f1',textDecoration:'none',fontWeight:700}}>Voir tout</a>
          </div>
          {recentBookings.length===0?(
            <div className="card" style={{padding:'40px',textAlign:'center'}}>
              <p style={{fontSize:14,color:'var(--tx3)',fontWeight:300}}>Aucune mission pour l'instant</p>
              <p style={{fontSize:12,color:'var(--tx3)',marginTop:8}}>Activez votre disponibilité pour recevoir des demandes</p>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {recentBookings.map(b=>(
                <div key={b.id} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:b.status==='completed'?'#10b981':b.status==='confirmed'?'#6366f1':'#ef4444',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{b.profiles?.full_name||'Client'}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{b.title||'Mission'} · {timeAgo(b.created_at)}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:b.status==='completed'?'#10b981':'var(--tx)'}}>{(b.price_agreed||0).toLocaleString('fr-DZ')} DA</div>
                  <span style={{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,background:b.status==='completed'?'#10b98112':b.status==='confirmed'?'#6366f112':'#ef444412',color:b.status==='completed'?'#10b981':b.status==='confirmed'?'#6366f1':'#ef4444'}}>{b.status==='completed'?'Terminé':b.status==='confirmed'?'Confirmé':b.status==='refused'?'Refusé':'Annulé'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
          {[
            {label:'Mon profil',href:'/artisan-dashboard/profil',Icon:User,desc:'Modifier mes infos'},
            {label:'Planning',href:'/artisan-dashboard/planning',Icon:Calendar,desc:'Gérer mes disponibilités'},
            {label:'Revenus',href:'/artisan-dashboard/revenus',Icon:BarChart3,desc:'Statistiques détaillées'},
            {label:'Carte',href:'/map',Icon:Map,desc:'Voir les clients proches'},
          ].map(l=>(
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
