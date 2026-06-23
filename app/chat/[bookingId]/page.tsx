'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlgerianPayment } from '@/components/AlgerianPayment'
import { OfferCard, type Offer } from '@/components/OfferCard'
import { ShieldCheck, Tag } from 'lucide-react'
import { useLang } from '@/lib/LangContext'

type Msg = { id:string; booking_id:string; sender_id:string; sender_name:string; sender_role:string; content:string; created_at:string }

export default function ChatPage(){
  const params=useParams()
  const bookingId=Array.isArray(params?.bookingId)?params.bookingId[0]:params?.bookingId
  const router=useRouter()
  const { t, isAr }=useLang()
  const [msgs,setMsgs]=useState<Msg[]>([])
  const [input,setInput]=useState('')
  const [user,setUser]=useState<any>(null)
  const [profile,setProfile]=useState<any>(null)
  const [booking,setBooking]=useState<any>(null)
  const [otherName,setOtherName]=useState('')
  const [sending,setSending]=useState(false)
  const [showPay,setShowPay]=useState(false)
  const [loadErr,setLoadErr]=useState('')
  const [sendErr,setSendErr]=useState('')
  const [offers,setOffers]=useState<Offer[]>([])
  const [showOfferInput,setShowOfferInput]=useState(false)
  const [offerAmount,setOfferAmount]=useState('')
  const [offerErr,setOfferErr]=useState('')
  const endRef=useRef<HTMLDivElement>(null)

  // Fusionne sans doublon (dédup par id) et garde l'ordre chronologique.
  const mergeMsgs=(incoming:Msg[])=>setMsgs(prev=>{
    const map=new Map(prev.map(m=>[m.id,m]))
    for(const m of incoming)map.set(m.id,m)
    return Array.from(map.values()).sort((a,b)=>a.created_at.localeCompare(b.created_at))
  })
  const mergeOffers=(incoming:Offer[])=>setOffers(prev=>{
    const map=new Map(prev.map(o=>[o.id,o]))
    for(const o of incoming)map.set(o.id,o)
    return Array.from(map.values()).sort((a,b)=>a.created_at.localeCompare(b.created_at))
  })

  useEffect(()=>{
    if(!bookingId)return
    let alive=true
    const fetchMsgs=async()=>{
      const{data,error}=await supabase.from('messages').select('*').eq('booking_id',bookingId).order('created_at',{ascending:true})
      if(!alive)return
      if(error){setLoadErr('Impossible de charger les messages : '+error.message);return}
      if(data)mergeMsgs(data as any)
    }
    const fetchOffers=async()=>{
      const{data}=await supabase.from('offers').select('*').eq('booking_id',bookingId).order('created_at',{ascending:true})
      if(!alive)return
      if(data)mergeOffers(data as any)
    }
    const init=async()=>{
      const{data:{user:u}}=await supabase.auth.getUser()
      if(!u){router.push('/auth/login');return};setUser(u)
      const{data:p}=await supabase.from('profiles').select('full_name,role').eq('id',u.id).single()
      if(p)setProfile(p)
      const{data:b,error:bErr}=await supabase.from('bookings').select('*').eq('id',bookingId).single()
      if(bErr){setLoadErr('Réservation introuvable : '+bErr.message);return}
      if(b){setBooking(b)
        const otherId=b.client_id===u.id?b.artisan_id:b.client_id
        const{data:op}=await supabase.from('profiles').select('full_name').eq('id',otherId).single()
        if(op)setOtherName(op.full_name)
      }
      await fetchMsgs()
      await fetchOffers()
    };init()

    // Realtime (idéal) + dédup de l'écho. Les offres écoutent aussi les UPDATE
    // (changements de statut accepté/refusé/remplacé).
    const ch=supabase.channel(`chat-${bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`booking_id=eq.${bookingId}`},(payload:any)=>{
        mergeMsgs([payload.new as Msg])
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'offers',filter:`booking_id=eq.${bookingId}`},()=>{ fetchOffers() })
      .subscribe()

    // Filet de sécurité : si le WebSocket Realtime est bloqué (WebView mobile,
    // réseau d'entreprise…), on rafraîchit quand même toutes les 4 s.
    const poll=setInterval(()=>{fetchMsgs();fetchOffers()},4000)

    return()=>{alive=false;supabase.removeChannel(ch);clearInterval(poll)}
  },[bookingId])

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send=async()=>{
    if(!input.trim()||!user||!profile||sending)return
    const content=input.trim()
    setSending(true);setSendErr('')
    // .select() pour récupérer la ligne insérée et l'afficher tout de suite,
    // sans dépendre du Realtime (qui peut être bloqué). La dédup par id évite
    // le doublon quand l'écho Realtime arrive ensuite.
    const{data,error}=await supabase.from('messages').insert({
      booking_id:bookingId,sender_id:user.id,
      sender_name:profile.full_name||'Moi',
      sender_role:profile.role||'client',
      content
    }).select().single()
    if(error){setSendErr(error.message);setSending(false);return}
    if(data)mergeMsgs([data as any])
    setInput('')
    setSending(false)
  }

  const isClient=booking&&user&&booking.client_id===user.id
  const isArtisan=booking&&user&&booking.artisan_id===user.id
  const isCard=booking?.payment_method==='card'
  // Négociation possible uniquement AVANT le séquestre (une fois payé/terminé,
  // le prix est gelé en base et l'argent est bloqué).
  const negotiable=!!booking&&['pending','confirmed'].includes(booking.status)
  // On ne paie dans l'app QUE pour la carte (cash = main propre).
  const canPay=isClient&&isCard&&booking?.status==='confirmed'&&(booking?.price_agreed||0)>0
  const onPaid=async()=>{ setShowPay(false) }

  const refreshOffers=async()=>{
    const{data}=await supabase.from('offers').select('*').eq('booking_id',bookingId).order('created_at',{ascending:true})
    if(data)setOffers(data as any)
  }
  // Envoyer une offre / contre-offre : remplace l'offre en attente précédente.
  const sendOffer=async(amount:number)=>{
    if(!user||!amount||amount<=0||!negotiable)return
    setOfferErr('')
    await supabase.from('offers').update({status:'superseded'}).eq('booking_id',bookingId).eq('status','pending')
    const{data,error}=await supabase.from('offers').insert({booking_id:bookingId,sender_id:user.id,amount,status:'pending'}).select().single()
    if(error){setOfferErr(error.message);return}
    if(data)mergeOffers([data as any])
    setShowOfferInput(false);setOfferAmount('')
    await refreshOffers()
  }
  const acceptOffer=async(o:Offer)=>{
    if(!negotiable)return
    await supabase.from('offers').update({status:'superseded'}).eq('booking_id',bookingId).eq('status','pending').neq('id',o.id)
    await supabase.from('offers').update({status:'accepted'}).eq('id',o.id)
    await supabase.from('bookings').update({price_agreed:o.amount,status:'confirmed'}).eq('id',bookingId)
    setBooking((b:any)=>b?{...b,price_agreed:o.amount,status:'confirmed'}:b)
    await refreshOffers()
    if(isClient)setShowPay(true)   // le client paie tout de suite (séquestre carte)
  }
  const declineOffer=async(o:Offer)=>{
    await supabase.from('offers').update({status:'declined'}).eq('id',o.id)
    await refreshOffers()
  }
  // Confirme la prestation : libère le séquestre (trigger en base) ou clôt le cash.
  const confirmDone=async()=>{
    await supabase.from('bookings').update({status:'completed'}).eq('id',bookingId)
    setBooking((b:any)=>b?{...b,status:'completed'}:b)
  }

  // Timeline unifiée messages + offres (offres seulement en mode carte).
  const timeline=[
    ...msgs.map(m=>({kind:'msg' as const,at:m.created_at,m})),
    ...(isCard?offers:[]).map(o=>({kind:'offer' as const,at:o.created_at,o})),
  ].sort((a,b)=>a.at.localeCompare(b.at))

  const formatTime=(d:string)=>{const t=new Date(d);return`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`}
  const formatDate=(d:string)=>{const x=new Date(d);const now=new Date();if(x.toDateString()===now.toDateString())return t('common.today');const y=new Date(now);y.setDate(y.getDate()-1);if(x.toDateString()===y.toDateString())return t('common.yesterday');return x.toLocaleDateString(isAr?'ar-DZ':'fr-FR',{day:'numeric',month:'short'})}

  let lastDate=''

  if(loadErr)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,paddingTop:80}}>
      <div style={{maxWidth:400,textAlign:'center'}}>
        <div style={{fontSize:32,marginBottom:16}}>⚠</div>
        <div style={{fontSize:15,fontWeight:700,color:'var(--tx)',marginBottom:10}}>Erreur de chargement</div>
        <div style={{fontSize:13,color:'#ef4444',background:'#ef444410',border:'1px solid #ef444420',borderRadius:10,padding:'12px 16px',marginBottom:20,textAlign:'left',wordBreak:'break-word'}}>{loadErr}</div>
        <button onClick={()=>router.back()} style={{padding:'10px 24px',borderRadius:10,background:'#6366f1',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>← Retour</button>
      </div>
    </div>
  )

  return(
    <div className="chat-screen" style={{height:'100dvh',background:'var(--bg)',display:'flex',flexDirection:'column',paddingTop:52,overflow:'hidden',direction:isAr?'rtl':'ltr'}}>
      {/* Header */}
      <div style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'14px 24px',display:'flex',alignItems:'center',gap:14}}>
        <button onClick={()=>router.back()} style={{background:'transparent',border:'none',color:'var(--tx2)',fontSize:20,cursor:'pointer'}}>←</button>
        <div style={{width:36,height:36,borderRadius:10,background:'#6366f115',border:'1px solid #6366f122',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#6366f1'}}>{(otherName||'?')[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{otherName||t('common.loading')}</div>
          <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{booking?.title||t('chat.conversation')}</div>
        </div>
        {booking&&<span style={{padding:'4px 12px',borderRadius:8,fontSize:10,fontWeight:700,background:booking.status==='confirmed'?'#6366f112':booking.status==='completed'?'#10b98112':'#f59e0b12',color:booking.status==='confirmed'?'#6366f1':booking.status==='completed'?'#10b981':'#f59e0b'}}>{t(`status.${booking.status}`)}</span>}
        {canPay&&<button onClick={()=>setShowPay(true)} style={{padding:'7px 16px',borderRadius:9,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif',whiteSpace:'nowrap'}}>{t('chat.pay')} {(booking.price_agreed||0).toLocaleString('fr-DZ')} {t('common.da')}</button>}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
        {timeline.length===0&&(
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <div style={{fontSize:14,color:'var(--tx3)',fontWeight:300,marginBottom:8}}>{t('chat.start')}</div>
            <div style={{fontSize:12,color:'var(--tx3)',fontWeight:300}}>{t('chat.startSub')}</div>
          </div>
        )}
        {timeline.map((item)=>{
          const dateStr=formatDate(item.at)
          let showDate=false;if(dateStr!==lastDate){showDate=true;lastDate=dateStr}
          const dateSep=showDate&&<div style={{textAlign:'center',margin:'16px 0 8px'}}><span style={{padding:'4px 14px',borderRadius:10,background:'var(--bg2)',border:'1px solid var(--border)',fontSize:11,color:'var(--tx3)'}}>{dateStr}</span></div>

          if(item.kind==='offer'){
            const o=item.o
            return(
              <div key={'o'+o.id}>
                {dateSep}
                <OfferCard offer={o} mine={o.sender_id===user?.id} isClient={!!isClient} t={t}
                  onAccept={()=>acceptOffer(o)}
                  onCounter={()=>{setOfferAmount(String(o.amount));setOfferErr('');setShowOfferInput(true)}}
                  onDecline={()=>declineOffer(o)}/>
              </div>
            )
          }

          const m=item.m
          const mine=m.sender_id===user?.id
          return(
            <div key={m.id}>
              {dateSep}
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
          lockCard={!!isCard}
          onSuccess={onPaid}
          onClose={()=>setShowPay(false)}
        />
      )}

      {/* Erreur d'envoi */}
      {sendErr&&<div style={{padding:'8px 16px',background:'#ef444412',borderTop:'1px solid #ef444422',fontSize:12,color:'#ef4444',fontWeight:300}}>{sendErr}</div>}

      {/* Séquestre carte : argent protégé + confirmer la prestation */}
      {isCard&&booking?.status==='in_progress'&&(
        <div style={{padding:'10px 16px',background:'#10b9810d',borderTop:'1px solid #10b98122',display:'flex',alignItems:'center',gap:10}}>
          <ShieldCheck size={17} color="#10b981" style={{flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:800,color:'#10b981'}}>{t('escrow.held')}</div>
            <div style={{fontSize:10.5,color:'var(--tx3)',fontWeight:300}}>{t('escrow.heldDesc')}</div>
          </div>
          {isClient&&<button onClick={confirmDone} style={{padding:'8px 13px',borderRadius:10,background:'#10b981',border:'none',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'Nexa,sans-serif',whiteSpace:'nowrap',flexShrink:0}}>{t('escrow.confirmDone')}</button>}
        </div>
      )}

      {/* Cash : info + confirmation de prestation par le client */}
      {booking&&!isCard&&!['completed','cancelled','refused'].includes(booking.status)&&(
        <div style={{padding:'9px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,fontSize:11.5,color:'var(--tx3)',fontWeight:300}}>{t('offer.cashHint')}</div>
          {isClient&&booking.status==='confirmed'&&<button onClick={confirmDone} style={{padding:'8px 13px',borderRadius:10,background:'#10b981',border:'none',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'Nexa,sans-serif',whiteSpace:'nowrap',flexShrink:0}}>{t('escrow.confirmDone')}</button>}
        </div>
      )}

      {/* Saisie d'une offre / contre-offre */}
      {showOfferInput&&(
        <div style={{padding:'12px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8}}>
          {offerErr&&<div style={{fontSize:11.5,color:'#ef4444'}}>{offerErr}</div>}
          <div style={{display:'flex',gap:8}}>
            <input type="number" inputMode="numeric" value={offerAmount} onChange={e=>setOfferAmount(e.target.value.replace(/\D/g,''))} placeholder={t('offer.amountPh')} autoFocus
              style={{flex:1,padding:'12px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:11,color:'var(--tx)',fontSize:15,outline:'none',fontFamily:'Nexa,sans-serif',fontWeight:700,minWidth:0}}/>
            <button onClick={()=>sendOffer(Number(offerAmount))} disabled={!offerAmount||Number(offerAmount)<=0}
              style={{padding:'0 16px',borderRadius:11,background:offerAmount&&Number(offerAmount)>0?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--border)',border:'none',color:offerAmount&&Number(offerAmount)>0?'#fff':'var(--tx3)',fontSize:13,fontWeight:800,cursor:offerAmount&&Number(offerAmount)>0?'pointer':'not-allowed',fontFamily:'Nexa,sans-serif',whiteSpace:'nowrap'}}>{t('offer.send')}</button>
            <button onClick={()=>{setShowOfferInput(false);setOfferAmount('');setOfferErr('')}} style={{padding:'0 13px',borderRadius:11,background:'transparent',border:'1px solid var(--border)',color:'var(--tx3)',fontSize:13,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>{t('offer.cancel')}</button>
          </div>
        </div>
      )}

      {/* Bouton « Proposer un prix » (artisan, carte, négociation ouverte) */}
      {isCard&&isArtisan&&!showOfferInput&&negotiable&&(
        <div style={{padding:'10px 16px 0',background:'var(--bg2)'}}>
          <button onClick={()=>{setOfferAmount('');setOfferErr('');setShowOfferInput(true)}} style={{width:'100%',padding:'11px',borderRadius:11,background:'var(--bg3)',border:'1px solid var(--accent)',color:'var(--accent)',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Nexa,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}><Tag size={15}/>{t('offer.propose')}</button>
        </div>
      )}

      {/* Input */}
      <div style={{background:'var(--bg2)',borderTop:'1px solid var(--border)',padding:'12px 16px calc(12px + env(safe-area-inset-bottom))',display:'flex',gap:10}}>
        <input value={input} onChange={e=>{setInput(e.target.value);setSendErr('')}} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder={t('chat.inputPh')} style={{flex:1,padding:'12px 16px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:12,color:'var(--tx)',fontSize:14,outline:'none',fontFamily:'Nexa,sans-serif',fontWeight:300}}/>
        <button onClick={send} disabled={sending||!input.trim()}
          style={{padding:'12px 20px',borderRadius:12,background:input.trim()?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--border)',border:'none',color:input.trim()?'#fff':'var(--tx3)',fontSize:13,fontWeight:700,cursor:input.trim()?'pointer':'not-allowed',fontFamily:'Nexa,sans-serif',transition:'all 0.2s'}}>
          {sending?'...':t('chat.send')}
        </button>
      </div>
    </div>
  )
}
