'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlgerianPayment } from '@/components/AlgerianPayment'

type Msg = { id:string; booking_id:string; sender_id:string; sender_name:string; sender_role:string; content:string; created_at:string }

export default function ChatPage(){
  const { bookingId }=useParams();const router=useRouter()
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState('')
  const [user,setUser]=useState<any>(null)
  const [profile,setProfile]=useState<any>(null)
  const [booking,setBooking]=useState<any>(null)
  const [otherName,setOtherName]=useState('')
  const [sending,setSending]=useState(false)
  const [showPay,setShowPay]=useState(false)
  const endRef=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const init=async()=>{
      const{data:{user:u}}=await supabase.auth.getUser()
      if(!u){router.push('/auth/login');return};setUser(u)
      const{data:p}=await supabase.from('profiles').select('full_name,role').eq('id',u.id).single()
      if(p)setProfile(p)
      const{data:b}=await supabase.from('bookings').select('*').eq('id',bookingId).single()
      if(b){setBooking(b)
        const otherId=b.client_id===u.id?b.artisan_id:b.client_id
        const{data:op}=await supabase.from('profiles').select('full_name').eq('id',otherId).single()
        if(op)setOtherName(op.full_name)
      }
      const{data:m}=await supabase.from('messages').select('*').eq('booking_id',bookingId).order('created_at',{ascending:true})
      if(m)setMsgs(m as any)
    };init()

    const ch=supabase.channel(`chat-${bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`booking_id=eq.${bookingId}`},(payload:any)=>{
        setMsgs(prev=>[...prev,payload.new as Msg])
      }).subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[bookingId])

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send=async()=>{
    if(!input.trim()||!user||!profile||sending)return;setSending(true)
    await supabase.from('messages').insert({booking_id:bookingId,sender_id:user.id,sender_name:profile.full_name||'Moi',sender_role:profile.role||'client',content:input.trim()})
    setInput('');setSending(false)
  }

  const isClient=booking&&user&&booking.client_id===user.id
  const canPay=isClient&&booking?.status==='confirmed'&&(booking?.price_agreed||0)>0
  const onPaid=async()=>{
    await supabase.from('bookings').update({status:'completed'}).eq('id',bookingId)
    setBooking((b:any)=>b?{...b,status:'completed'}:b);setShowPay(false)
  }

  const formatTime=(d:string)=>{const t=new Date(d);return`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`}
  const formatDate=(d:string)=>{const t=new Date(d);const now=new Date();if(t.toDateString()===now.toDateString())return"Aujourd'hui";const y=new Date(now);y.setDate(y.getDate()-1);if(t.toDateString()===y.toDateString())return'Hier';return t.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}

  let lastDate=''

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',paddingTop:52}}>
      {/* Header */}
      <div style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'14px 24px',display:'flex',alignItems:'center',gap:14}}>
        <button onClick={()=>router.back()} style={{background:'transparent',border:'none',color:'var(--tx2)',fontSize:20,cursor:'pointer'}}>←</button>
        <div style={{width:36,height:36,borderRadius:10,background:'#6366f115',border:'1px solid #6366f122',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#6366f1'}}>{(otherName||'?')[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{otherName||'Chargement...'}</div>
          <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{booking?.title||'Conversation'}</div>
        </div>
        {booking&&<span style={{padding:'4px 12px',borderRadius:8,fontSize:10,fontWeight:700,background:booking.status==='confirmed'?'#6366f112':booking.status==='completed'?'#10b98112':'#f59e0b12',color:booking.status==='confirmed'?'#6366f1':booking.status==='completed'?'#10b981':'#f59e0b'}}>{booking.status==='confirmed'?'Confirmé':booking.status==='completed'?'Terminé':'En attente'}</span>}
        {canPay&&<button onClick={()=>setShowPay(true)} style={{padding:'7px 16px',borderRadius:9,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif',whiteSpace:'nowrap'}}>Payer {(booking.price_agreed||0).toLocaleString('fr-FR')} €</button>}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
        {msgs.length===0&&(
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <div style={{fontSize:14,color:'var(--tx3)',fontWeight:300,marginBottom:8}}>Démarrez la conversation</div>
            <div style={{fontSize:12,color:'var(--tx3)',fontWeight:300}}>Décrivez votre besoin à l'artisan</div>
          </div>
        )}
        {msgs.map((m,i)=>{
          const mine=m.sender_id===user?.id
          const dateStr=formatDate(m.created_at)
          let showDate=false;if(dateStr!==lastDate){showDate=true;lastDate=dateStr}
          return(
            <div key={m.id}>
              {showDate&&<div style={{textAlign:'center',margin:'16px 0 8px'}}><span style={{padding:'4px 14px',borderRadius:10,background:'var(--bg2)',border:'1px solid var(--border)',fontSize:11,color:'var(--tx3)'}}>{dateStr}</span></div>}
              <div style={{display:'flex',justifyContent:mine?'flex-end':'flex-start',marginBottom:6}}>
                <div className="anim-msg-in" style={{maxWidth:'75%',padding:'10px 14px',borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',background:mine?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--bg2)',border:mine?'none':'1px solid var(--border)',color:mine?'#fff':'var(--tx)'}}>
                  {!mine&&<div style={{fontSize:10,color:'#6366f1',fontWeight:700,marginBottom:4}}>{m.sender_name}</div>}
                  <div style={{fontSize:13,lineHeight:1.6,fontWeight:300}}>{m.content}</div>
                  <div style={{fontSize:9,marginTop:4,textAlign:'right',color:mine?'rgba(255,255,255,0.6)':'var(--tx3)'}}>{formatTime(m.created_at)}</div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef}/>
      </div>

      {showPay&&booking&&(
        <AlgerianPayment
          amount={booking.price_agreed||0}
          artisanName={otherName||'Artisan'}
          serviceTitle={booking.title||'Service'}
          bookingId={String(bookingId)}
          onSuccess={onPaid}
          onClose={()=>setShowPay(false)}
        />
      )}

      {/* Input */}
      <div style={{background:'var(--bg2)',borderTop:'1px solid var(--border)',padding:'12px 24px',display:'flex',gap:10}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Écrire un message..." style={{flex:1,padding:'12px 16px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:12,color:'var(--tx)',fontSize:14,outline:'none',fontFamily:'Nexa,sans-serif',fontWeight:300}}/>
        <button onClick={send} disabled={sending||!input.trim()}
          style={{padding:'12px 20px',borderRadius:12,background:input.trim()?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--border)',border:'none',color:input.trim()?'#fff':'var(--tx3)',fontSize:13,fontWeight:700,cursor:input.trim()?'pointer':'not-allowed',fontFamily:'Nexa,sans-serif',transition:'all 0.2s'}}>
          {sending?'...':'Envoyer'}
        </button>
      </div>
    </div>
  )
}
