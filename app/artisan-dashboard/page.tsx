'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User as AuthUser } from '@supabase/supabase-js'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { formatDA } from '@/lib/format'
import { Wallet, CheckCircle2, Clock, Star, User, Calendar, BarChart3, Map, Sparkles } from 'lucide-react'
import { isLaunchFree, SUB_FREE_UNTIL } from '@/lib/plans'
import NavigateButton from '@/components/NavigateButton'
import { fetchPhones, fetchMyPhone } from '@/lib/phones'
import { logError } from '@/lib/logError'

const STATUS_TONE:Record<string,string>={pending:'var(--warning)',confirmed:'var(--accent)',in_progress:'var(--accent)',completed:'var(--success)',refused:'var(--danger)',cancelled:'var(--tx2)'}
const tone=(c:string):React.CSSProperties=>({background:`color-mix(in srgb, ${c} 13%, transparent)`,color:`color-mix(in srgb, ${c} 72%, var(--tx))`})
const SCOPE_CSS=`.dash-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

type ProfileRow={full_name:string|null;avatar_url:string|null;phone:string|null}
type ArtisanRow={is_available:boolean;rating_avg:number|null;rating_count:number|null;bio:string|null;lat:number|null;lng:number|null;hourly_rate:number|null;category:string|null}
type BookingRow={id:string;client_id:string;status:string;title:string;description:string|null;created_at:string;address:string;price_agreed:number|null;lat:number|null;lng:number|null;profiles:{full_name?:string|null;phone?:string|null}|null}

export default function ArtisanDashboard(){
  const router=useRouter();const{t,isAr,lang}=useLang()
  const [user,setUser]=useState<AuthUser|null>(null)
  const [profile,setProfile]=useState<ProfileRow|null>(null)
  const [artisan,setArtisan]=useState<ArtisanRow|null>(null)
  const [bookings,setBookings]=useState<BookingRow[]>([])
  const [stats,setStats]=useState({revenue:0,missions:0,pending:0,rating:0,ratingCount:0})
  const [loading,setLoading]=useState(true)
  const [isAvailable,setIsAvailable]=useState(false)
  const gpsRef=useRef<number|null>(null)

  useEffect(()=>{load()},[])
  useEffect(()=>()=>{if(gpsRef.current!==null)navigator.geolocation.clearWatch(gpsRef.current)},[])

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
    if(p){const mp=await fetchMyPhone(u.id,p.phone);setProfile({...p,phone:mp})}
    if(a){setArtisan(a);setIsAvailable(a.is_available)}
    if(b){const ph=await fetchPhones(b.map(x=>x.client_id));setBookings(b.map(x=>({...x,profiles:{...(x.profiles||{}),phone:ph[x.client_id]||x.profiles?.phone||null}})))}
    const rev=(completed||[]).reduce((s:number,x)=>s+(x.price_agreed||0),0)
    const pending=(b||[]).filter(x=>x.status==='pending').length
    setStats({revenue:rev,missions:(completed||[]).length,pending,rating:a?.rating_avg||0,ratingCount:a?.rating_count||0})
    setLoading(false)
  }

  // Position exacte -> artisan_live_location ; repli artisans.lat/lng (arrondi par trigger) si la table n'existe pas encore
  const pushLive=async(pos:GeolocationPosition)=>{
    if(!user)return
    const lat=pos.coords.latitude,lng=pos.coords.longitude
    try{
      const{error}=await supabase.from('artisan_live_location').upsert({artisan_id:user.id,lat,lng,updated_at:new Date().toISOString()},{onConflict:'artisan_id'})
      if(!error){
        if(!artisan?.lat||!artisan?.lng){const{error:e2}=await supabase.from('artisans').update({lat,lng}).eq('id',user.id);if(e2)logError('dashboard.pushLive.coarse',e2)}
        return
      }
      logError('dashboard.pushLive.live',error) // table absente avant privacy_hardening.sql : repli sur artisans.lat/lng (arrondi par trigger)
    }catch(e){logError('dashboard.pushLive.live',e)}
    const{error:e3}=await supabase.from('artisans').update({lat,lng}).eq('id',user.id)
    if(e3)logError('dashboard.pushLive.fallback',e3)
  }

  const toggleAvail=async()=>{
    if(!user)return;const nv=!isAvailable;setIsAvailable(nv)
    if(nv&&navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async pos=>{
        await supabase.from('artisans').update({is_available:true}).eq('id',user.id);await pushLive(pos)
      },()=>{supabase.from('artisans').update({is_available:true}).eq('id',user.id)})
      gpsRef.current=navigator.geolocation.watchPosition(async pos=>{
        await pushLive(pos)
      },()=>{},{enableHighAccuracy:true,maximumAge:10000})
    }else{
      if(gpsRef.current!==null){navigator.geolocation.clearWatch(gpsRef.current);gpsRef.current=null}
      await supabase.from('artisans').update({is_available:false}).eq('id',user.id)
    }
  }

  const respond=async(bookingId:string,accept:boolean)=>{
    const{error}=await supabase.from('bookings').update({status:accept?'confirmed':'refused'}).eq('id',bookingId)
    if(error){alert(t('common.errGeneric'));return}
    setBookings(prev=>prev.map(x=>x.id===bookingId?{...x,status:accept?'confirmed':'refused'}:x))
    setStats(p=>({...p,pending:Math.max(0,p.pending-1)}))
  }

  // Complétion profil
  const completion=(()=>{
    if(!artisan||!profile)return 0;const total=7;let s=0
    if(profile.full_name)s++;if(profile.avatar_url)s++;if(profile.phone)s++
    if(artisan.bio&&artisan.bio.length>10)s++;if(artisan.lat&&artisan.lng)s++
    if((artisan.hourly_rate??0)>0)s++;if(artisan.category)s++
    return Math.round((s/total)*100)
  })()

  const missing=(()=>{
    if(!artisan||!profile)return[]
    const m:string[]=[]
    if(!profile.avatar_url)m.push(t('dashExtra.todoPhoto'))
    if(!artisan.bio||artisan.bio.length<10)m.push(t('dashExtra.todoBio'))
    if(!artisan.lat||!artisan.lng)m.push(t('dashExtra.todoAddress'))
    if(!artisan.hourly_rate||artisan.hourly_rate===0)m.push(t('dashExtra.todoRate'))
    return m
  })()

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/60000);return x<1?'À l\'instant':x<60?`${x} min`:x<1440?`${Math.floor(x/60)}h`:`${Math.floor(x/1440)}j`}

  const pendingBookings=bookings.filter(b=>b.status==='pending')
  const recentBookings=bookings.filter(b=>b.status!=='pending').slice(0,5)
  const subFree=isLaunchFree()
  const subUntil=SUB_FREE_UNTIL.toLocaleDateString('fr-DZ',{day:'numeric',month:'long',year:'numeric'})

  if(loading)return<div role="status" aria-label={t('common.loading')} style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  const statusLabel=(s:string)=>({completed:t('dashExtra.statusDone'),confirmed:t('dashExtra.statusConfirmed'),pending:t('dashExtra.statusPending'),in_progress:t('dashExtra.statusInProgress'),refused:t('dashExtra.statusRefused')}[s]||t('dashExtra.statusCancelled'))

  return(
    <div className="dash-scope" style={{minHeight:'100vh',paddingTop:64,direction:isAr?'rtl':'ltr'}}>
      <style>{SCOPE_CSS}</style>
      <div className="page-pad-m" style={{maxWidth:1000,margin:'0 auto',padding:'28px 24px 48px'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28,flexWrap:'wrap',gap:16}}>
          <div>
            <h1 style={{fontSize:'clamp(24px,6vw,30px)',lineHeight:1.15,fontWeight:800,color:'var(--tx)',marginBottom:6}}>👋 {profile?.full_name?.split(' ')[0] || 'Artisan'}</h1>
            <p style={{fontSize:14,color:'var(--tx2)'}}>{t('dashExtra.activityToday')}</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            {/* Disponibilité toggle */}
            <button onClick={toggleAvail} aria-pressed={isAvailable} style={{display:'flex',alignItems:'center',gap:8,minHeight:44,padding:'10px 18px',borderRadius:'var(--r-btn)',border:`1px solid ${isAvailable?'color-mix(in srgb, var(--success) 40%, transparent)':'var(--border2)'}`,background:isAvailable?'color-mix(in srgb, var(--success) 12%, var(--bg2))':'var(--bg2)',cursor:'pointer',transition:'all 0.2s'}}>
              <span aria-hidden className={isAvailable?'anim-pulse':undefined} style={{width:9,height:9,borderRadius:'50%',background:isAvailable?'var(--success)':'var(--tx2)',transition:'all 0.3s'}}/>
              <span style={{fontSize:14,fontWeight:700,color:isAvailable?'color-mix(in srgb, var(--success) 72%, var(--tx))':'var(--tx2)'}}>{isAvailable?t('dashExtra.online'):t('dashExtra.offline')}</span>
            </button>
            <Link href="/artisan-dashboard/profil" className="btn-primary btn-sm" style={{minHeight:44}}>{t('dashExtra.myProfile')}</Link>
          </div>
        </div>

        {/* Abonnement */}
        <Link href="/artisan-dashboard/abonnement" className="acard" style={{padding:'16px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:14,textDecoration:'none'}}>
          <div aria-hidden style={{width:40,height:40,borderRadius:11,background:'var(--accent)',boxShadow:'0 2px 0 var(--accent-ink)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#fff'}}><Sparkles size={20}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:'var(--tx)',marginBottom:2}}>{subFree?`${t('dashExtra.launchFree')} ${subUntil}`:t('dashExtra.yourSub')}</div>
            <div style={{fontSize:13,color:'var(--tx2)'}}>{t('dashExtra.seePlans')}</div>
          </div>
        </Link>

        {/* Complétion profil */}
        {completion<100&&(
          <div className="card" style={{padding:'18px 20px',marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10}}>
              <span style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{t('dashExtra.profileComplete')} <span className="num">{completion}%</span></span>
              <Link href="/artisan-dashboard/profil" style={{fontSize:13,color:'var(--accent)',textDecoration:'none',fontWeight:700,padding:'10px 2px'}}>{t('dashExtra.completeLink')}</Link>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} aria-label={t('dashExtra.profileComplete')} style={{height:8,background:'var(--bg3)',borderRadius:4,overflow:'hidden',marginBottom:12}}>
              <div style={{height:'100%',width:`${completion}%`,background:'var(--accent)',borderRadius:4,transition:'width 0.5s'}}/>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {missing.map(m=><span key={m} style={{padding:'5px 11px',borderRadius:'var(--r-chip)',fontSize:12.5,fontWeight:600,...tone('var(--warning)')}}>{m}</span>)}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:28}}>
          {[
            {label:t('dashExtra.kpiRevenue'),value:formatDA(stats.revenue,lang,lang==='ar'?'0 دج':'0 DA'),Icon:Wallet,color:'var(--success)',sub:t('dashExtra.kpiRevenueSub')},
            {label:t('dashExtra.kpiMissions'),value:stats.missions,Icon:CheckCircle2,color:'var(--accent)',sub:t('dashExtra.kpiMissionsSub')},
            {label:t('dashExtra.kpiPending'),value:stats.pending,Icon:Clock,color:'var(--warning)',sub:t('dashExtra.kpiPendingSub')},
            {label:t('dashExtra.kpiRating'),value:stats.rating?`${stats.rating.toFixed(1)}/5`:'—',Icon:Star,color:'var(--laiton)',sub:`${stats.ratingCount} ${t('dashExtra.ratingUnit')}`},
          ].map(k=>(
            <div key={k.label} className="card" style={{padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:10}}>
                <span style={{fontSize:11.5,color:'var(--tx2)',fontWeight:700,letterSpacing:'0.04em',textTransform:'uppercase'}}>{k.label}</span>
                <span aria-hidden style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,...tone(k.color)}}><k.Icon size={15}/></span>
              </div>
              <div className="num" style={{fontSize:'clamp(21px,5.6vw,28px)',lineHeight:1.1,fontWeight:800,color:'var(--tx)',marginBottom:6,whiteSpace:'nowrap'}}>{k.value}</div>
              <div style={{fontSize:12.5,color:'var(--tx2)'}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Demandes en attente — réponse rapide */}
        {pendingBookings.length>0&&(
          <div style={{marginBottom:24}}>
            <h2 style={{fontSize:19,fontWeight:800,color:'var(--tx)',marginBottom:14}}>{t('dashExtra.pendingTitle')} <span className="num" style={{color:'var(--tx2)',fontWeight:600}}>({pendingBookings.length})</span></h2>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {pendingBookings.map(b=>(
                <div key={b.id} className="card" style={{borderColor:'color-mix(in srgb, var(--warning) 45%, var(--border))',padding:'16px 18px',display:'flex',alignItems:'center',gap:'12px 16px',flexWrap:'wrap'}}>
                  <div aria-hidden style={{width:40,height:40,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,...tone('var(--warning)')}}><Clock size={18}/></div>
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{fontSize:15,fontWeight:700,color:'var(--tx)',marginBottom:2}}>{b.profiles?.full_name||t('dashExtra.clientFallback')}</div>
                    <div style={{fontSize:13.5,color:'var(--tx)'}}>{b.title||b.description||t('dashExtra.requestFallback')}</div>
                    <div style={{fontSize:12.5,color:'var(--tx2)',marginTop:4}}>{timeAgo(b.created_at)} · {b.address||t('dashExtra.addrFallback')}</div>
                  </div>
                  <div className="num" style={{fontSize:17,fontWeight:800,color:'var(--tx)',marginInlineEnd:8,whiteSpace:'nowrap'}}>{formatDA(b.price_agreed,lang)}</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button onClick={()=>respond(b.id,true)} className="btn-success btn-sm" style={{minHeight:44}}>{t('dashExtra.accept')}</button>
                    <button onClick={()=>respond(b.id,false)} className="btn-ghost btn-sm" style={{minHeight:44,color:'var(--danger)',borderColor:'color-mix(in srgb, var(--danger) 40%, transparent)'}}>{t('dashExtra.refuse')}</button>
                    <Link href={`/chat/${b.id}`} className="btn-ghost btn-sm" style={{minHeight:44}}>{t('dashExtra.message')}</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique récent */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10}}>
            <h2 style={{fontSize:19,fontWeight:800,color:'var(--tx)'}}>{t('dashExtra.recentHistory')}</h2>
            <Link href="/artisan-dashboard/revenus" style={{fontSize:13,color:'var(--accent)',textDecoration:'none',fontWeight:700,padding:'12px 4px'}}>{t('dashExtra.seeAll')}</Link>
          </div>
          {recentBookings.length===0?(
            <div className="card" style={{padding:'36px 24px',textAlign:'center'}}>
              <p style={{fontSize:15,color:'var(--tx)',fontWeight:600}}>{t('dashExtra.noMission')}</p>
              <p style={{fontSize:13.5,color:'var(--tx2)',marginTop:8,lineHeight:1.5}}>{t('dashExtra.activateHint')}</p>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {recentBookings.map(b=>{
                const sc=STATUS_TONE[b.status]||'var(--danger)'
                return(
                <div key={b.id} className="card" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                  <div aria-hidden style={{width:8,height:8,borderRadius:'50%',background:sc,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.profiles?.full_name||t('dashExtra.clientFallback')}</div>
                    <div style={{fontSize:12.5,color:'var(--tx2)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title||t('dashExtra.missionFallback')} · {timeAgo(b.created_at)}</div>
                  </div>
                  {(b.status==='confirmed'||b.status==='in_progress')&&<NavigateButton lat={b.lat} lng={b.lng} compact/>}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                    <div className="num" style={{fontSize:14,fontWeight:700,color:'var(--tx)',whiteSpace:'nowrap'}}>{formatDA(b.price_agreed,lang)}</div>
                    <span style={{padding:'3px 9px',borderRadius:'var(--r-chip)',fontSize:11,fontWeight:700,whiteSpace:'nowrap',...tone(sc)}}>{statusLabel(b.status)}</span>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
          {[
            {label:t('dashExtra.qlProfile'),href:'/artisan-dashboard/profil',Icon:User,desc:t('dashExtra.qlEditInfo')},
            {label:t('dashExtra.qlPlanning'),href:'/artisan-dashboard/planning',Icon:Calendar,desc:t('dashExtra.qlDispo')},
            {label:t('dashExtra.qlRevenus'),href:'/artisan-dashboard/revenus',Icon:BarChart3,desc:t('dashExtra.qlStats')},
            {label:t('dashExtra.qlMap'),href:'/map',Icon:Map,desc:t('dashExtra.qlNearClients')},
          ].map(l=>(
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
