'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PortfolioFeed } from '@/components/Portfolio'
import { contactArtisan, isDemoArtisan } from '@/lib/contactArtisan'
import BookingFlow from '@/components/BookingFlow'
import { useLang } from '@/lib/LangContext'

function Stars({r,s=14}:{r:number;s?:number}){return<div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(i=><svg key={i} width={s} height={s} viewBox="0 0 24 24" fill={i<=Math.round(r)?'#f59e0b':'var(--border,#2a2a3a)'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

const COLORS:Record<string,string>={plomberie:'#3b82f6',electricite:'#f59e0b',menage:'#10b981',demenagement:'#8b5cf6',jardinage:'#22c55e',peinture:'#ef4444',serrurerie:'#f97316',informatique:'#6366f1',coiffure:'#ec4899',autre:'#a78bfa'}

export default function ArtisanPage(){
  const params=useParams();const id=params?.id as string;const router=useRouter()
  const { t, isAr } = useLang()
  const [a,setA]=useState<any>(null)
  const [p,setP]=useState<any>(null)
  const [revs,setRevs]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [uid,setUid]=useState<string|null>(null)
  const [tab,setTab]=useState<'about'|'portfolio'|'reviews'|'rates'>('about')
  const [sent,setSent]=useState(false)

  const bg='var(--bg)';const bg2='var(--bg2)';const bg3='var(--bg3)'
  const tx='var(--tx)';const tx2='var(--tx2)';const tx3='var(--tx3)'
  const brd='var(--border)'

  const timeAgo=(d:string)=>{
    const x=Math.floor((Date.now()-new Date(d).getTime())/86400000)
    if(x===0)return t('common.today')
    if(x===1)return t('common.yesterday')
    if(x<7)return`${x} ${t('common.daysShort')}`
    if(x<30)return`${Math.floor(x/7)} ${t('common.weeksShort')}`
    return`${Math.floor(x/30)} ${t('common.monthsShort')}`
  }

  useEffect(()=>{load()},[id])
  const load=async()=>{
    setLoading(true)
    const{data:{user}}=await supabase.auth.getUser();if(user)setUid(user.id)
    const[{data:art},{data:prof}]=await Promise.all([
      supabase.from('artisans').select('*').eq('id',id).single(),
      supabase.from('profiles').select('full_name,phone,avatar_url').eq('id',id).single(),
    ])
    if(art)setA(art);if(prof)setP(prof)
    const{data:r}=await supabase.from('reviews').select('id,rating,comment,photos,created_at,profiles!reviews_client_id_fkey(full_name)').eq('artisan_id',id).order('created_at',{ascending:false}).limit(30)
    if(r)setRevs(r)
    setLoading(false)
  }

  const [contactErr,setContactErr]=useState("")
  const [booking,setBooking]=useState(false)
  const contact=async(ty:"message"|"call")=>{
    setContactErr("")
    if(!uid){router.push('/auth/login');return}
    if(isDemoArtisan(id)){setContactErr(t('contact.demoProfile'));return}
    if(ty==='message'){setBooking(true);return}
    const res=await contactArtisan({clientId:uid,artisanId:id,category:a?.category,hourlyRate:a?.hourly_rate,type:ty})
    if(!res.ok){setContactErr(res.message);return}
    setSent(true)
  }

  if(loading)return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:64}}><div style={{fontSize:14,color:'var(--tx3)'}}>{t('common.loading')}</div></div>

  const art=a||{category:'plomberie',bio:'',hourly_rate:0,rating_avg:0,rating_count:0,total_missions:0,years_experience:0,intervention_radius_km:20,is_available:true,location_city:'Algérie',tags:[]}
  const prof=p||{full_name:'Artisan BETI',phone:null,avatar_url:null}
  const c=COLORS[art.category]||'#6366f1'
  const init=prof.full_name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)||'A'
  const avgR=revs.length>0?revs.reduce((s:number,r:any)=>s+r.rating,0)/revs.length:art.rating_avg||0

  const TABS=[
    {id:'about'    as const,label:t('profile.about')},
    {id:'portfolio'as const,label:t('profile.portfolio')},
    {id:'reviews'  as const,label:`${t('profile.reviews')} (${revs.length})`},
    {id:'rates'    as const,label:t('profile.rates')},
  ]

  return(
    <>
      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0}body{font-family:Nexa,system-ui,sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      {/* ── APP BAR MOBILE : retour + nom artisan (remplace le header générique) ── */}
      <div className="mobile-only" style={{position:'fixed',top:0,left:0,right:0,zIndex:50,height:'calc(54px + env(safe-area-inset-top))',paddingTop:'env(safe-area-inset-top)',paddingLeft:12,paddingRight:12,alignItems:'center',gap:10,background:'var(--nav-bg)',backdropFilter:'blur(20px) saturate(180%)',WebkitBackdropFilter:'blur(20px) saturate(180%)',borderBottom:'0.5px solid var(--border)',direction:isAr?'rtl':'ltr'}}>
        <button onClick={()=>router.back()} aria-label={t('common.back')} style={{width:34,height:34,borderRadius:12,background:'var(--bg2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0}}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--tx)" strokeWidth="2.2" style={{transform:isAr?'rotate(180deg)':'none'}}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{flex:1,minWidth:0,fontSize:16,fontWeight:800,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prof.full_name}</span>
      </div>

      <div style={{minHeight:'100vh',background:bg,paddingTop:52,direction:isAr?'rtl':'ltr'}}>

        {/* ── HERO BANNER ── */}
        <div style={{position:'relative',height:190,background:`linear-gradient(160deg, ${c}25, ${bg} 70%)`,overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 40% 50%, ${c}12, transparent 60%)`}}/>
          <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(circle at 2px 2px, ${c}08 1px, transparent 0)`,backgroundSize:'24px 24px'}}/>
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:80,background:`linear-gradient(transparent,${bg})`}}/>
        </div>

        {/* ── PROFILE CARD overlapping banner ── */}
        <div style={{maxWidth:800,margin:'-100px auto 0',padding:'0 24px',position:'relative',zIndex:2}}>
          <div style={{background:bg2,border:`1px solid ${brd}`,borderRadius:24,boxShadow:'var(--card-shadow)',overflow:'hidden',animation:'fadeUp 0.6s ease'}}>

            {/* Avatar + Name section */}
            <div style={{padding:'32px 32px 24px',textAlign:'center'}}>
              {prof.avatar_url?(
                <img src={prof.avatar_url} alt="" style={{width:96,height:96,borderRadius:24,objectFit:'cover',border:`4px solid ${bg2}`,boxShadow:`0 8px 32px ${c}22`,margin:'0 auto 16px',display:'block'}}/>
              ):(
                <div style={{width:96,height:96,borderRadius:24,background:`linear-gradient(135deg, ${c}35, ${c}15)`,border:`4px solid ${bg2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:800,color:c,boxShadow:`0 8px 32px ${c}22`,margin:'0 auto 16px'}}>{init}</div>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:6}}>
                <h1 style={{fontSize:28,fontWeight:800,color:tx}}>{prof.full_name}</h1>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#6366f1"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>

              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:12}}>
                <span style={{padding:'4px 14px',borderRadius:20,background:`${c}12`,border:`1px solid ${c}22`,fontSize:12,color:c,fontWeight:700}}>{t(`categories.${art.category}`)}</span>
                <span style={{fontSize:13,color:tx3}}>{art.location_city||'Algérie'}</span>
                {art.is_available&&(
                  <span style={{display:'flex',alignItems:'center',gap:5,padding:'4px 12px',borderRadius:20,background:'#10b98110',border:'1px solid #10b98120',fontSize:12,color:'#10b981',fontWeight:600}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b98155'}}/>{t('common.online')}
                  </span>
                )}
              </div>

              {/* Rating */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:20}}>
                <Stars r={avgR} s={16}/><span style={{fontSize:16,fontWeight:800,color:'#f59e0b'}}>{avgR.toFixed(1)}</span>
                <span style={{fontSize:13,color:tx3}}>({art.rating_count||revs.length} {t('common.reviews')})</span>
              </div>

              {/* Stats row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:24}}>
                {[
                  {v:(art.hourly_rate||0).toLocaleString('fr-DZ'),u:t('common.da'),       l:t('profile.rates')     },
                  {v:art.total_missions||0,                        u:'',                   l:t('profile.missions')  },
                  {v:`${art.years_experience||0}`,                 u:t('common.years'),    l:t('profile.experience')},
                  {v:`${art.intervention_radius_km||20}`,          u:t('common.km'),       l:t('profile.radius')    },
                ].map(s=>(
                  <div key={s.l} style={{padding:'14px 8px',borderRadius:14,background:bg3,border:`1px solid ${brd}`,textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:tx}}>{s.v} <span style={{fontSize:11,fontWeight:300,color:tx3}}>{s.u}</span></div>
                    <div style={{fontSize:11,color:tx3,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons — desktop seulement (mobile = barre collée en bas) */}
              <div className="desktop-only" style={{display:'flex',gap:10,maxWidth:400,margin:'0 auto'}}>
                {sent?(
                  <div style={{flex:1,padding:14,borderRadius:12,background:'#10b98112',border:'1px solid #10b98122',textAlign:'center'}}>
                    <span style={{fontSize:14,color:'#10b981',fontWeight:700}}>{t('profile.requestSent')}</span>
                  </div>
                ):(
                  <>
                    <button onClick={()=>contact('message')} style={{flex:1,padding:'14px 24px',borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif',boxShadow:'0 4px 16px #6366f133',transition:'all 0.2s'}}>{t('home.sendMessage')}</button>
                    <button onClick={()=>contact('call')} style={{padding:'14px 20px',borderRadius:12,background:'transparent',border:`1px solid #10b98144`,color:'#10b981',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Nexa,sans-serif',transition:'all 0.2s'}}>{t('home.call')}</button>
                  </>
                )}
              </div>
              {contactErr&&<div className="desktop-only" style={{display:'block',textAlign:'center',marginTop:10,fontSize:12,color:'#f87171',fontWeight:500}}>{contactErr}</div>}
            </div>

            {/* Tags */}
            {art.tags&&art.tags.length>0&&(
              <div style={{padding:'0 32px 20px',display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
                {art.tags.map((tag:string)=><span key={tag} style={{padding:'4px 12px',borderRadius:20,background:bg3,border:`1px solid ${brd}`,fontSize:11,color:tx2}}>{tag}</span>)}
              </div>
            )}

            {/* ── TABS ── */}
            <div style={{borderTop:`1px solid ${brd}`,display:'flex'}}>
              {TABS.map(item=>(
                <button key={item.id} onClick={()=>setTab(item.id)} style={{flex:1,padding:'16px',background:'transparent',border:'none',borderBottom:tab===item.id?'2px solid #6366f1':'2px solid transparent',color:tab===item.id?'#6366f1':tx3,fontSize:13,fontWeight:tab===item.id?700:300,cursor:'pointer',fontFamily:'Nexa,sans-serif',transition:'all 0.2s'}}>{item.label}</button>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div style={{padding:'28px 32px 32px'}}>

              {/* About */}
              {tab==='about'&&(
                <div style={{animation:'fadeUp 0.3s ease'}}>
                  <h3 style={{fontSize:16,fontWeight:800,color:tx,marginBottom:10}}>{t('profile.description')}</h3>
                  <p style={{fontSize:14,color:tx2,lineHeight:1.8,fontWeight:300,marginBottom:28}}>{art.bio||t('profile.defaultBio')}</p>
                  <h3 style={{fontSize:16,fontWeight:800,color:tx,marginBottom:10}}>{t('profile.zone')}</h3>
                  <p style={{fontSize:14,color:tx2,fontWeight:300}}>{art.location_city||'Algérie'} — {t('profile.radiusOf')} {art.intervention_radius_km||20} {t('common.km')}</p>
                </div>
              )}

              {/* Portfolio */}
              {tab==='portfolio'&&(
                <div style={{animation:'fadeUp 0.3s ease'}}>
                  <PortfolioFeed artisanId={id}/>
                </div>
              )}

              {/* Reviews */}
              {tab==='reviews'&&(
                <div style={{animation:'fadeUp 0.3s ease'}}>
                  {revs.length>0&&(
                    <div style={{display:'flex',gap:24,alignItems:'center',padding:24,background:bg3,border:`1px solid ${brd}`,borderRadius:16,marginBottom:24,flexWrap:'wrap'}}>
                      <div style={{textAlign:'center',minWidth:80}}>
                        <div style={{fontSize:44,fontWeight:800,color:'#f59e0b',lineHeight:1}}>{avgR.toFixed(1)}</div>
                        <Stars r={avgR} s={14}/>
                        <div style={{fontSize:12,color:tx3,marginTop:4}}>{revs.length} {t('common.reviews')}</div>
                      </div>
                      <div style={{flex:1,minWidth:180}}>
                        {[5,4,3,2,1].map(star=>{
                          const cnt=revs.filter((r:any)=>r.rating===star).length
                          const pct=Math.round((cnt/revs.length)*100)
                          return(
                            <div key={star} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                              <span style={{fontSize:12,color:tx3,width:10}}>{star}</span>
                              <div style={{flex:1,height:6,background:brd,borderRadius:3,overflow:'hidden'}}>
                                <div style={{width:`${pct}%`,height:'100%',background:'#f59e0b',borderRadius:3,transition:'width 0.5s'}}/>
                              </div>
                              <span style={{fontSize:11,color:tx3,width:32}}>{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {revs.length===0?(
                    <div style={{textAlign:'center',padding:48,color:tx3,fontSize:14,fontWeight:300}}>{t('profile.noReviewsYet')}</div>
                  ):(
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {revs.map((r:any)=>(
                        <div key={r.id} style={{background:bg3,border:`1px solid ${brd}`,borderRadius:14,padding:'18px 20px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div style={{width:36,height:36,borderRadius:10,background:brd,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:tx2}}>{(r.profiles?.full_name||'C')[0]}</div>
                              <div>
                                <div style={{fontSize:14,fontWeight:700,color:tx}}>{r.profiles?.full_name||t('profile.verifiedClient')}</div>
                                <div style={{fontSize:11,color:tx3}}>{timeAgo(r.created_at)}</div>
                              </div>
                            </div>
                            <Stars r={r.rating} s={12}/>
                          </div>
                          {r.comment&&<p style={{fontSize:13,color:tx2,lineHeight:1.7,fontWeight:300}}>{r.comment}</p>}
                          {r.photos&&r.photos.length>0&&(
                            <div style={{display:'flex',gap:8,marginTop:12}}>
                              {r.photos.map((url:string,i:number)=><img key={i} src={url} alt="" style={{width:72,height:72,borderRadius:10,objectFit:'cover',border:`1px solid ${brd}`}}/>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rates */}
              {tab==='rates'&&(
                <div style={{animation:'fadeUp 0.3s ease'}}>
                  <div style={{background:bg3,border:`1px solid ${brd}`,borderRadius:16,padding:24}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                      <div>
                        <div style={{fontSize:11,color:tx3,fontWeight:700,letterSpacing:'0.06em',marginBottom:4}}>{t('profile.rateLabel')}</div>
                        <div style={{fontSize:32,fontWeight:800,color:tx}}>{(art.hourly_rate||0).toLocaleString('fr-DZ')} <span style={{fontSize:14,color:tx3,fontWeight:300}}>{t('common.da')}</span></div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        {(['CIB','Edahabia','Cash'] as const).map(m=>(
                          <div key={m} style={{padding:'4px 10px',borderRadius:8,background:bg2,border:`0.5px solid ${brd}`,fontSize:11,color:tx3,fontWeight:300,display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:'#10b981'}}/>
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{height:1,background:brd,marginBottom:16}}/>
                    <p style={{fontSize:13,color:tx2,fontWeight:300,lineHeight:1.7}}>{t('profile.rateNote')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{height:80}}/>
        {/* Dégagement supplémentaire pour la barre d'action collée (mobile) */}
        <div className="mobile-only" style={{height:96}}/>
      </div>

      {/* ── BARRE D'ACTION COLLÉE EN BAS (mobile) — au-dessus du dock ── */}
      <div className="mobile-only above-tabbar" style={{position:'fixed',left:0,right:0,bottom:0,zIndex:50,flexDirection:'column',gap:8,padding:'12px 16px 14px',background:'var(--nav-bg)',backdropFilter:'blur(20px) saturate(180%)',WebkitBackdropFilter:'blur(20px) saturate(180%)',borderTop:'0.5px solid var(--border)',direction:isAr?'rtl':'ltr'}}>
        {contactErr&&<div style={{fontSize:12,color:'#f87171',fontWeight:500,textAlign:'center'}}>{contactErr}</div>}
        {sent?(
          <div style={{padding:14,borderRadius:13,background:'#10b98112',border:'1px solid #10b98122',textAlign:'center'}}>
            <span style={{fontSize:14,color:'#10b981',fontWeight:700}}>{t('profile.requestSent')}</span>
          </div>
        ):(
          <div style={{display:'flex',gap:10,width:'100%'}}>
            <button onClick={()=>contact('message')} style={{flex:1,padding:'15px 24px',borderRadius:13,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'Nexa,sans-serif',boxShadow:'0 6px 20px #6366f140'}}>{t('home.sendMessage')}</button>
            <button onClick={()=>contact('call')} aria-label={t('home.call')} style={{padding:'15px 18px',borderRadius:13,background:'var(--bg2)',border:'1px solid #10b98144',color:'#10b981',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'Nexa,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </div>
        )}
      </div>

      {booking&&uid&&(
        <BookingFlow
          artisan={{id,name:prof.full_name||'Artisan',category:art.category,hourlyRate:art.hourly_rate||0,color:c}}
          clientId={uid}
          onClose={()=>setBooking(false)}
        />
      )}
    </>
  )
}
