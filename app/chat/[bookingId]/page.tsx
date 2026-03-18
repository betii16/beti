'use client'

// app/chat/[bookingId]/page.tsx
// Chat temps réel entre client et artisan via Supabase Realtime

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Message = {
  id: string
  booking_id: string
  sender_id: string
  sender_name: string
  sender_role: 'client' | 'artisan'
  content: string
  created_at: string
  read: boolean
}

export default function ChatPage() {
  const { bookingId } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      // Charger profil
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      // Charger réservation
      const { data: book } = await supabase.from('bookings')
        .select('*, artisan:artisans(id, profiles(full_name, avatar_url)), client:profiles!bookings_client_id_fkey(full_name, avatar_url)')
        .eq('id', bookingId).single()
      setBooking(book)

      // Charger messages existants
      const { data: msgs } = await supabase.from('messages')
        .select('*').eq('booking_id', bookingId).order('created_at', { ascending: true })
      if (msgs) setMessages(msgs)

      // Marquer comme lus
      await supabase.from('messages').update({ read: true })
        .eq('booking_id', bookingId).neq('sender_id', user.id)
    }
    init()
  }, [bookingId])

  // Écoute temps réel
  useEffect(() => {
    if (!bookingId) return
    const channel = supabase.channel(`chat-${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        setOtherTyping(false)
      })
      .on('broadcast', { event: 'typing' }, () => {
        setOtherTyping(true)
        clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => setOtherTyping(false), 2000)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  // Scroll auto vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherTyping])

  const sendTyping = () => {
    supabase.channel(`chat-${bookingId}`).send({ type: 'broadcast', event: 'typing', payload: {} })
  }

  const sendMessage = async () => {
    if (!input.trim() || !user || sending) return
    setSending(true)
    const msg = {
      booking_id: bookingId,
      sender_id: user.id,
      sender_name: profile?.full_name || user.email,
      sender_role: profile?.role || 'client',
      content: input.trim(),
      read: false,
    }
    await supabase.from('messages').insert(msg)
    setInput('')
    setSending(false)
  }

  const otherName = profile?.role === 'artisan'
    ? booking?.client?.full_name || 'Client'
    : booking?.artisan?.profiles?.full_name || 'Artisan'

  const otherAvatar = profile?.role === 'artisan'
    ? booking?.client?.avatar_url
    : booking?.artisan?.profiles?.avatar_url

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#0D0D12', display: 'flex', flexDirection: 'column', fontFamily: 'Nexa, sans-serif', paddingTop: 64 }}>

        {/* Header chat */}
        <div style={{ background: '#161620', borderBottom: '0.5px solid #2a2a3a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 64, zIndex: 10 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20, padding: 4 }}>←</button>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#C9A84C22', border: '1.5px solid #C9A84C44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#C9A84C', flexShrink: 0 }}>
            {otherAvatar ? <img src={otherAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/> : (otherName[0] || 'A')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#F0EDE8' }}>{otherName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse 2s infinite' }}/>
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 300 }}>En ligne · Réservation #{String(bookingId).slice(0, 8)}</span>
            </div>
          </div>
          {booking?.status === 'accepted' && (
            <div style={{ padding: '6px 14px', borderRadius: 20, background: '#0a2010', border: '0.5px solid #4ade8044', fontSize: 11, color: '#4ade80', fontWeight: 800 }}>
              MISSION EN COURS
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720, margin: '0 auto', width: '100%' }}>

          {/* Date separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: '#1e1e2a' }}/>
            <span style={{ fontSize: 11, color: '#444', fontWeight: 300 }}>Aujourd'hui</span>
            <div style={{ flex: 1, height: '0.5px', background: '#1e1e2a' }}/>
          </div>

          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 14, color: '#555', fontWeight: 300 }}>Commencez la conversation avec {otherName}</div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id
            const showAvatar = !isMe && (i === 0 || messages[i-1]?.sender_id !== msg.sender_id)
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, animation: 'slideUp 0.2s ease' }}>
                {!isMe && (
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C9A84C22', border: '1px solid #C9A84C33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#C9A84C', flexShrink: 0, opacity: showAvatar ? 1 : 0 }}>
                    {msg.sender_name[0]}
                  </div>
                )}
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                  <div style={{
                    padding: '10px 16px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe ? '#C9A84C' : '#161620',
                    border: isMe ? 'none' : '0.5px solid #2a2a3a',
                    fontSize: 14, color: isMe ? '#0D0D12' : '#F0EDE8', fontWeight: isMe ? 500 : 300, lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: '#444', fontWeight: 300 }}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <span style={{ marginLeft: 6, color: msg.read ? '#C9A84C' : '#555' }}>{msg.read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Indicateur frappe */}
          {otherTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C9A84C22', border: '1px solid #C9A84C33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#C9A84C', flexShrink: 0 }}>
                {otherName[0]}
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: '#161620', border: '0.5px solid #2a2a3a', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#555', animation: `typing 1s infinite ${i * 0.2}s` }}/>)}
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Suggestions rapides */}
        <div style={{ padding: '8px 24px', maxWidth: 720, margin: '0 auto', width: '100%', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {["Je suis en route 🚗", "J'arrive dans 10 min ⏰", "Travail terminé ✅", "Combien ça coûte ?", "Merci !"].map(s => (
            <button key={s} onClick={() => setInput(s)}
              style={{ padding: '6px 14px', borderRadius: 20, background: '#161620', border: '0.5px solid #2a2a3a', color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'Nexa, sans-serif', fontWeight: 300, whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#C9A84C'; (e.target as HTMLElement).style.color = '#C9A84C' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#2a2a3a'; (e.target as HTMLElement).style.color = '#888' }}
            >{s}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 24px 24px', background: '#0D0D12', borderTop: '0.5px solid #1e1e2a', maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#161620', border: '0.5px solid #2a2a3a', borderRadius: 16, padding: '12px 16px', transition: 'border-color 0.2s' }}
            onFocus={() => {}} onBlur={() => {}}
          >
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); sendTyping() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Écrire un message..."
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: 14, fontFamily: 'Nexa, sans-serif', fontWeight: 300, resize: 'none', lineHeight: 1.5 }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              style={{ width: 38, height: 38, borderRadius: '50%', background: input.trim() ? '#C9A84C' : '#2a2a3a', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#0D0D12' : '#555'} strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#333', fontWeight: 300 }}>Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</div>
        </div>
      </div>
    </>
  )
}
