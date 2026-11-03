'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { User as AuthUser, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'
import { logError } from '@/lib/logError'
import ReportButton from '@/components/ReportButton'
import { ArrowLeft, Send, MessageCircle, AlertTriangle } from 'lucide-react'

// Statut de la réservation → token couleur ; focus clavier visible.
const STATUS_TONE:Record<string,string>={pending:'var(--warning)',confirmed:'var(--accent)',in_progress:'var(--accent)',completed:'var(--success)',refused:'var(--danger)',cancelled:'var(--tx2)'}
const SCOPE_CSS=`.chat-scope :is(a,button):focus-visible{outline:2px solid var(--accent);outline-offset:2px}`

type Msg = { id:string; booking_id:string; sender_id:string; sender_name:string; sender_role:string; content:string; created_at:string }

type BookingRow = { id:string; client_id:string; artisan_id:string; status:string; title?:string|null }

export default function ChatPage(){
  const params=useParams()
  const bookingId=Array.isArray(params?.bookingId)?params.bookingId[0]:params?.bookingId
  const router=useRouter()
  const { t, isAr }=useLang()
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState('')
  const [user,setUser]=useState<AuthUser|null>(null)
  const [profile,setProfile]=useState<{full_name:string|null;role:string|null}|null>(null)
  const [booking,setBooking]=useState<BookingRow|null>(null)
  const [otherName,setOtherName]=useState('')
  const [sending,setSending]=useState(false)
  const [loadErr,setLoadErr]=useState('')
  const [sendErr,setSendErr]=useState('')
  const [reloadKey,setReloadKey]=useState(0)
  const [acting,setActing]=useState(false)
  const endRef=useRef<HTMLDivElement>(null)

  // Fusionne sans doublon (dédup par id) et garde l'ordre chronologique.
  const mergeMsgs=(incoming:Msg[])=>setMsgs(prev=>{
    const map=new Map(prev.map(m=>[m.id,m]))
    for(const m of incoming)map.set(m.id,m)
    return Array.from(map.values()).sort((a,b)=>a.created_at.localeCompare(b.created_at))
  })

  useEffect(()=>{
    if(!bookingId)return
    let alive=true
    const fetchMsgs=async(initial=false)=>{
      if(!initial&&typeof document!=='undefined'&&document.hidden)return
      const{data,error}=await supabase.from('messages').select('*').eq('booking_id',bookingId).order('created_at',{ascending:true}).returns<Msg[]>()
      if(!alive)return
      if(error){logError('chat.fetchMessages',error,{bookingId});if(initial)setLoadErr(t('cxb.loadErr'));return}
      if(data)mergeMsgs(data)
    }
    const init=async()=>{
      const{data:{user:u}}=await supabase.auth.getUser()
      if(!u){router.push('/auth/login?next='+encodeURIComponent('/chat/'+bookingId));return};setUser(u)
      const{data:p,error:pErr}=await supabase.from('profiles').select('full_name,role').eq('id',u.id).single()
      if(pErr)logError('chat.loadProfile',pErr) // non bloquant : le nom d'expéditeur retombe sur « Moi »
      if(p)setProfile(p)
      const{data:b,error:bErr}=await supabase.from('bookings').select('*').eq('id',bookingId).single()
      if(bErr){logError('chat.loadBooking',bErr,{bookingId});if(!alive)return;setLoadErr(bErr.code==='PGRST116'?t('cxb.notFound'):t('cxb.loadErr'));return}
      if(b){setBooking(b)
        const otherId=b.client_id===u.id?b.artisan_id:b.client_id
        const{data:op}=await supabase.from('profiles').select('full_name').eq('id',otherId).single()
        if(op)setOtherName(op.full_name)
      }
      await fetchMsgs(true)
    };init()

    // Realtime (idéal) + dédup de l'écho.
    const ch=supabase.channel(`chat-${bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`booking_id=eq.${bookingId}`},(payload:RealtimePostgresChangesPayload<Msg>)=>{
        mergeMsgs([payload.new as Msg])
      })
      .subscribe()

    // Filet de sécurité : si le WebSocket Realtime est bloqué (WebView mobile,
    // réseau d'entreprise…), on rafraîchit quand même toutes les 4 s.
    const poll=setInterval(()=>{fetchMsgs()},4000)

    return()=>{alive=false;supabase.removeChannel(ch);clearInterval(poll)}
  },[bookingId,reloadKey])

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send=async()=>{
    if(!input.trim()||!user||sending)return
    const content=input.trim()
    setSending(true);setSendErr('')
    // .select() pour récupérer la ligne insérée et l'afficher tout de suite,
    // sans dépendre du Realtime (qui peut être bloqué). La dédup par id évite
    // le doublon quand l'écho Realtime arrive ensuite.
    const{data,error}=await supabase.from('messages').insert({
      booking_id:bookingId,sender_id:user.id,
      sender_name:profile?.full_name||'Moi',
      sender_role:profile?.role||'client',
      content
    }).select().single()
    if(error){logError('chat.send',error,{bookingId});setSendErr(t('cxb.sendFail'));setSending(false);return}
    if(data)mergeMsgs([data])
    setInput('')
    setSending(false)
  }

  const isClient=booking&&user&&booking.client_id===user.id
  const isArtisan=booking&&user&&booking.artisan_id===user.id

  // Prestation payée en CASH, en main propre (BETI n'encaisse rien). Clôture en
  // deux temps : 1) l'artisan signale « travail terminé » → status 'in_progress',
  // 2) le client confirme → 'completed' (ce qui débloque l'avis).
  const setStatus=async(status:'in_progress'|'completed')=>{
    if(acting)return
    setActing(true);setSendErr('')
    const{error}=await supabase.from('bookings').update({status}).eq('id',bookingId)
    setActing(false)
    if(error){logError('chat.setStatus',error,{bookingId,status});setSendErr(t('cxb.actionFail'));return}
    setBooking(b=>b?{...b,status}:b)
  }
  const markDone=()=>setStatus('in_progress')
  const confirmDone=()=>setStatus('completed')

  const timeline=msgs.map(m=>({at:m.created_at,m})).sort((a,b)=>a.at.localeCompare(b.at))

  const formatTime=(d:string)=>{const t=new Date(d);return`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`}
  const formatDate=(d:string)=>{const x=new Date(d);const now=new Date();if(x.toDateString()===now.toDateString())return t('common.today');const y=new Date(now);y.setDate(y.getDate()-1);if(x.toDateString()===y.toDateString())return t('common.yesterday');return x.toLocaleDateString(isAr?'ar-DZ':'fr-FR',{day:'numeric',month:'short'})}

  let lastDate=''

  if(loadErr)return(
    <div className="chat-scope" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16,paddingTop:80,direction:isAr?'rtl':'ltr'}}>
      <style>{SCOPE_CSS}</style>
      <div role="alert" className="card" style={{maxWidth:420,width:'100%',textAlign:'center',padding:'28px 22px'}}>
        <div aria-hidden style={{width:52,height:52,borderRadius:14,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--danger)',background:'color-mix(in srgb, var(--danger) 11%, transparent)'}}><AlertTriangle size={24}/></div>
        <div style={{fontSize:17,fontWeight:800,color:'var(--tx)',marginBottom:10}}>{t('cxb.loadErrTitle')}</div>
        <div style={{fontSize:14,color:'var(--tx2)',lineHeight:1.55,marginBottom:20,overflowWrap:'anywhere'}}>{loadErr}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>{setLoadErr('');setReloadKey(k=>k+1)}} className="btn-primary" style={{minHeight:44}}>{t('cxb.retry')}</button>
          <button onClick={()=>router.back()} className="btn-ghost" style={{minHeight:44}}><ArrowLeft size={16} aria-hidden style={{transform:isAr?'scaleX(-1)':undefined}}/> {t('cxb.back')}</button>
        </div>
      </div>
    </div>
  )

  const doneBtn:React.CSSProperties={minHeight:40,padding:'9px 14px',fontSize:13,flexShrink:0}
  const st=booking?STATUS_TONE[booking.status]||'var(--tx2)':'var(--tx2)'

  return(
    <div className="chat-screen chat-scope" style={{height:'100dvh',background:'var(--bg)',display:'flex',flexDirection:'column',paddingTop:52,overflow:'hidden',direction:isAr?'rtl':'ltr'}}>
      <style>{SCOPE_CSS}</style>
      {/* Header */}
      <div style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',paddingTop:8,paddingBottom:8,paddingInlineStart:8,paddingInlineEnd:16,display:'flex',alignItems:'center',gap:10}}>
        <button onClick={()=>router.back()} aria-label={t('cxb.back')} style={{width:44,height:44,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',borderRadius:12,color:'var(--tx)',cursor:'pointer'}}><ArrowLeft size={22} style={{transform:isAr?'scaleX(-1)':undefined}}/></button>
        <div aria-hidden style={{width:40,height:40,borderRadius:11,flexShrink:0,background:'color-mix(in srgb, var(--accent) 13%, transparent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'var(--accent)'}}>{(otherName||'?')[0].toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{otherName||t('common.loading')}</div>
          <div style={{fontSize:12.5,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{booking?.title||t('chat.conversation')}</div>
        </div>
        {booking&&user&&bookingId&&<ReportButton variant="icon" targetType="booking" targetId={bookingId} bookingId={bookingId} reportedUserId={booking.client_id===user.id?booking.artisan_id:booking.client_id} title={t('rep.aboutChat')} label={t('rep.aboutChat')}/>}
        {booking&&<span style={{padding:'4px 10px',borderRadius:'var(--r-chip)',fontSize:11.5,fontWeight:700,flexShrink:0,whiteSpace:'nowrap',background:`color-mix(in srgb, ${st} 13%, transparent)`,color:`color-mix(in srgb, ${st} 72%, var(--tx))`}}>{t(`status.${booking.status}`)}</span>}
      </div>

      {/* Messages */}
      <div role="log" aria-live="polite" style={{flex:1,overflowY:'auto',padding:'12px 14px 16px',overscrollBehavior:'contain'}}>
        {timeline.length===0&&(
          <div style={{textAlign:'center',padding:'56px 16px'}}>
            <div aria-hidden style={{width:56,height:56,borderRadius:16,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)',background:'color-mix(in srgb, var(--accent) 12%, transparent)'}}><MessageCircle size={26}/></div>
            <div style={{fontSize:15,color:'var(--tx)',fontWeight:700,marginBottom:6}}>{t('chat.start')}</div>
            <div style={{fontSize:13.5,color:'var(--tx2)',lineHeight:1.5,maxWidth:300,margin:'0 auto'}}>{t('chat.startSub')}</div>
          </div>
        )}
        {timeline.map((item)=>{
          const dateStr=formatDate(item.at)
          let showDate=false;if(dateStr!==lastDate){showDate=true;lastDate=dateStr}
          const dateSep=showDate&&<div style={{textAlign:'center',margin:'16px 0 8px'}}><span style={{padding:'4px 12px',borderRadius:'var(--r-pill)',background:'var(--bg2)',border:'1px solid var(--border)',fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{dateStr}</span></div>

          const m=item.m
          const mine=m.sender_id===user?.id
          return(
            <div key={m.id}>
              {dateSep}
              <div style={{display:'flex',justifyContent:mine?'flex-end':'flex-start',marginBottom:6}}>
                <div className="anim-msg-in" style={{maxWidth:'min(80%, 520px)',padding:'9px 13px 7px',borderRadius:16,...(mine?{borderEndEndRadius:5}:{borderEndStartRadius:5}),background:mine?'var(--accent)':'var(--bg2)',border:mine?'1px solid transparent':'1px solid var(--border)',color:mine?'#fff':'var(--tx)',boxShadow:mine?'0 1px 0 var(--accent-ink)':'none'}}>
                  {!mine&&<div style={{fontSize:12,color:'var(--accent)',fontWeight:700,marginBottom:3}}>{m.sender_name}</div>}
                  <div dir="auto" style={{fontSize:15,lineHeight:1.5,fontWeight:400,whiteSpace:'pre-wrap',overflowWrap:'anywhere',textAlign:'start'}}>{m.content}</div>
                  <time dateTime={m.created_at} className="num" style={{display:'block',fontSize:11,marginTop:3,textAlign:'end',color:mine?'rgba(255,255,255,0.82)':'var(--tx2)'}}>{formatTime(m.created_at)}</time>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef}/>
      </div>

      {/* Erreur d'envoi */}
      {sendErr&&<div role="alert" style={{padding:'10px 16px',background:'color-mix(in srgb, var(--danger) 10%, var(--bg2))',borderTop:'1px solid color-mix(in srgb, var(--danger) 30%, transparent)',fontSize:13,color:'var(--danger)',fontWeight:600,lineHeight:1.45}}>{sendErr}</div>}

      {/* Clôture de la prestation (cash, en deux temps artisan → client) */}
      {booking&&!['completed','cancelled','refused'].includes(booking.status)&&(
        <div style={{padding:'10px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1,minWidth:0,fontSize:12.5,color:'var(--tx2)',lineHeight:1.5}}>
            {booking.status==='in_progress'
              ? (isClient?t('done.awaitingClient'):t('done.awaitingArtisan'))
              : t('done.cashHint')}
          </div>
          {isArtisan&&booking.status==='confirmed'&&<button onClick={markDone} className="btn-success btn-sm" disabled={acting} style={doneBtn}>{t('done.markDone')}</button>}
          {isClient&&booking.status==='in_progress'&&<button onClick={confirmDone} className="btn-success btn-sm" disabled={acting} style={doneBtn}>{t('done.confirm')}</button>}
        </div>
      )}

      {/* Input */}
      <form onSubmit={e=>{e.preventDefault();send()}} style={{background:'var(--bg2)',borderTop:'1px solid var(--border)',padding:'10px 12px calc(10px + env(safe-area-inset-bottom))',display:'flex',alignItems:'center',gap:8}}>
        <input value={input} onChange={e=>{setInput(e.target.value);setSendErr('')}}
          aria-label={t('chat.inputPh')} enterKeyHint="send" autoComplete="off" maxLength={2000}
          placeholder={t('chat.inputPh')} className="field" style={{flex:1,minWidth:0,minHeight:46,padding:'11px 16px',borderRadius:'var(--r-pill)',background:'var(--bg)',fontSize:16}}/>
        <button type="submit" disabled={sending||!input.trim()} aria-label={t('chat.send')} aria-busy={sending}
          className="btn-primary" style={{minHeight:46,minWidth:46,padding:'0 18px',borderRadius:'var(--r-pill)'}}>
          <Send size={18} aria-hidden style={{transform:isAr?'scaleX(-1)':undefined}}/>
          <span className="desktop-only">{sending?'…':t('chat.send')}</span>
        </button>
      </form>
    </div>
  )
}
