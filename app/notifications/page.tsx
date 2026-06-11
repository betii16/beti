'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, Star, Inbox, MessageSquare, Phone, Clock, Bell } from 'lucide-react'

const ICONS:Record<string,{Icon:any;color:string}>={
  booking_confirmed:{Icon:CheckCircle2,color:'#10b981'},booking_cancelled:{Icon:XCircle,color:'#ef4444'},
  booking_completed:{Icon:Star,color:'#6366f1'},new_booking:{Icon:Inbox,color:'#3b82f6'},
  new_message:{Icon:MessageSquare,color:'#8b5cf6'},call_request:{Icon:Phone,color:'#f59e0b'},
  reminder:{Icon:Clock,color:'#6366f1'},default:{Icon:Bell,color:'var(--tx3)'}
}

export default function NotificationsPage(){
  const router=useRouter()
  const [notifs,setNotifs]=useState<any[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{load()},[])
  const load=async()=>{
    const{data:{user}}=await supabase.auth.getUser()
    if(!user){router.push('/auth/login');return}
    const{data}=await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
    if(data)setNotifs(data)
    // Mark all as read
    await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false)
    setLoading(false)
  }

  const timeAgo=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/60000);return x<1?"À l'instant":x<60?`${x} min`:x<1440?`${Math.floor(x/60)}h`:`${Math.floor(x/1440)}j`}
  const clear=async()=>{const{data:{user}}=await supabase.auth.getUser();if(user)await supabase.from('notifications').delete().eq('user_id',user.id);setNotifs([])}
  const unread=notifs.filter(n=>!n.is_read).length

  if(loading)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div className="loader-ring"/></div>

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingTop:64,fontFamily:'Nexa,system-ui,sans-serif'}}>
      <div style={{maxWidth:640,margin:'0 auto',padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <div><h1 style={{fontSize:26,fontWeight:800,color:'var(--tx)'}}>Notifications</h1>
          {unread>0&&<p style={{fontSize:13,color:'#6366f1',fontWeight:300}}>{unread} non lue{unread>1?'s':''}</p>}</div>
          {notifs.length>0&&<button onClick={clear} style={{padding:'8px 16px',borderRadius:10,background:'transparent',border:'1px solid var(--border)',color:'var(--tx3)',fontSize:12,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>Tout effacer</button>}
        </div>

        {notifs.length===0?(
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,padding:'64px',textAlign:'center',boxShadow:'var(--card-shadow)'}}>
            <div style={{fontSize:14,color:'var(--tx3)'}}>Aucune notification</div>
          </div>
        ):(
          <div className="stagger" style={{display:'flex',flexDirection:'column',gap:6}}>
            {notifs.map(n=>{
              const cfg=ICONS[n.type]||ICONS.default
              return(
                <div key={n.id} style={{background:'var(--bg2)',border:`1px solid ${n.is_read?'var(--border)':cfg.color+'33'}`,borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'flex-start',gap:12,boxShadow:'var(--card-shadow)',transition:'all 0.2s',opacity:n.is_read?0.7:1}}>
                  <div style={{width:32,height:32,borderRadius:8,background:cfg.color+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><cfg.Icon size={15} color={cfg.color}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)',marginBottom:2}}>{n.title}</div>
                    <div style={{fontSize:12,color:'var(--tx2)',fontWeight:300,lineHeight:1.5}}>{n.message||n.body||''}</div>
                  </div>
                  <div style={{fontSize:11,color:'var(--tx3)',flexShrink:0,fontWeight:300}}>{timeAgo(n.created_at)}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
