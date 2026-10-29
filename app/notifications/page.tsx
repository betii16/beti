'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { CheckCircle2, XCircle, Star, Inbox, MessageSquare, Phone, Clock, Bell } from 'lucide-react'

const ICONS:Record<string,{Icon:any;color:string}>={
  booking_confirmed:{Icon:CheckCircle2,color:'var(--success)'},booking_cancelled:{Icon:XCircle,color:'var(--danger)'},
  booking_refused:{Icon:XCircle,color:'var(--danger)'},
  booking_completed:{Icon:Star,color:'var(--laiton)'},new_booking:{Icon:Inbox,color:'var(--accent)'},
  new_message:{Icon:MessageSquare,color:'var(--accent)'},call_request:{Icon:Phone,color:'var(--warning)'},
  reminder:{Icon:Clock,color:'var(--accent)'},default:{Icon:Bell,color:'var(--tx2)'}
}
const SCOPE_CSS=`.notif-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

export default function NotificationsPage(){
  const router=useRouter()
  const { t, isAr } = useLang()
  const [notifs,setNotifs]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [loadErr,setLoadErr]=useState(false)

  useEffect(()=>{load()},[])
  const load=async()=>{
    const{data:{user}}=await supabase.auth.getUser()
    if(!user){router.push('/auth/login?next=/notifications');return}
    const{data,error}=await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
    if(error){setLoadErr(true);setLoading(false);return}
    setLoadErr(false)
    if(data)setNotifs(data)
    // Mark all as read
    await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false)
    setLoading(false)
  }

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/60000);return x<1?t('common.justNow'):x<60?`${x} ${t('common.minShort')}`:x<1440?`${Math.floor(x/60)}${t('common.hourShort')}`:`${Math.floor(x/1440)}${t('common.daysShort')}`}
  const clear=async()=>{if(!window.confirm(t('cxb.notifsClear')))return;const{data:{user}}=await supabase.auth.getUser();if(!user)return;const{error}=await supabase.from('notifications').delete().eq('user_id',user.id);if(error){setLoadErr(true);return};setLoadErr(false);setNotifs([])}
  const linkOf=(n:any):string|null=>n.link||(n.booking_id?`/chat/${n.booking_id}`:null)
  const unread=notifs.filter(n=>!n.is_read).length

  if(loading)return<div role="status" aria-label={t('common.loading')} style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  return(
    <div className="notif-scope" style={{minHeight:'100vh',paddingTop:64,direction:isAr?'rtl':'ltr'}}>
      <style>{SCOPE_CSS}</style>
      <div className="page-pad-m" style={{maxWidth:640,margin:'0 auto',padding:'28px 24px 48px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:20}}>
          <div><h1 style={{fontSize:'clamp(24px,6vw,28px)',lineHeight:1.15,fontWeight:800,color:'var(--tx)'}}>{t('notifs.title')}</h1>
          {unread>0&&<p style={{fontSize:14,color:'var(--accent)',fontWeight:600,marginTop:4}}><span className="num">{unread}</span> {t('notifs.unread')}</p>}</div>
          {notifs.length>0&&<button onClick={clear} className="btn-ghost btn-sm" style={{minHeight:44}}>{t('notifs.clearAll')}</button>}
        </div>

        {loadErr&&<div role="alert" className="card" style={{padding:'14px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',color:'var(--danger)',fontSize:14,fontWeight:600}}>
          <span style={{flex:1,minWidth:0}}>{t('cxb.notifsErr')}</span>
          <button onClick={()=>{setLoading(true);load()}} className="btn-ghost btn-sm" style={{minHeight:44}}>{t('cxb.retry')}</button>
        </div>}
        {notifs.length===0&&loadErr?null:notifs.length===0?(
          <div className="card" style={{padding:'48px 24px',textAlign:'center'}}>
            <div aria-hidden style={{width:56,height:56,borderRadius:14,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)',background:'color-mix(in srgb, var(--accent) 12%, transparent)'}}><Bell size={26}/></div>
            <div style={{fontSize:15,fontWeight:600,color:'var(--tx)'}}>{t('notifs.empty')}</div>
          </div>
        ):(
          <ul className="stagger" style={{display:'flex',flexDirection:'column',gap:8,listStyle:'none'}}>
            {notifs.map(n=>{
              const cfg=ICONS[n.type]||ICONS.default
              return(
                <li key={n.id} className="card" onClick={()=>{const l=linkOf(n);if(l)router.push(l)}} style={{cursor:linkOf(n)?'pointer':undefined,borderColor:n.is_read?undefined:`color-mix(in srgb, ${cfg.color} 40%, var(--border))`,padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:12}}>
                  <div aria-hidden style={{width:36,height:36,borderRadius:10,background:`color-mix(in srgb, ${cfg.color} 13%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><cfg.Icon size={17} color={cfg.color}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:n.is_read?600:800,color:'var(--tx)',marginBottom:3,display:'flex',alignItems:'center',gap:6}}>
                      {!n.is_read&&<span aria-label={t('notifs.unread')} style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)',flexShrink:0}}/>}
                      <span style={{minWidth:0,overflowWrap:'anywhere'}}>{n.title}</span>
                    </div>
                    <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.5,overflowWrap:'anywhere'}}>{n.message||n.body||''}</div>
                  </div>
                  <time dateTime={n.created_at} style={{fontSize:12,color:'var(--tx2)',flexShrink:0,whiteSpace:'nowrap'}}>{timeAgo(n.created_at)}</time>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
