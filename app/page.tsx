'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { haversineKm } from '@/lib/distance'
import { contactArtisan, isDemoArtisan } from '@/lib/contactArtisan'
import { fetchListingPlans, isListed } from '@/lib/subscription'
import { artisanAvatar } from '@/lib/avatar'
import BookingFlow from '@/components/BookingFlow'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { useLang } from '@/lib/LangContext'
import { CategoryIcon, categoryColor, categoryInk, pressable } from '@/components/icons'
import CategoryCard from '@/components/CategoryCard'
import { LayoutGrid, MapPinned, Search, CalendarCheck, CheckCircle2, Sun, Moon, X, Shapes, SearchX } from 'lucide-react'
import MobileHome from '@/components/MobileHome'
import { LogoMark } from '@/components/Logo'
import CinematicGate from '@/components/cinematic/CinematicGate'

type Artisan = { artisan_id:string;full_name:string;avatar_url:string|null;category:string;rating_avg:number;rating_count:number;hourly_rate:number;distance_km:number|null;is_available:boolean;total_missions:number;bio?:string }
type Review = { id:string;rating:number;comment:string|null;created_at:string;photos?:string[];profiles?:{full_name:string}|null }

// Libellés/descriptions traduits au rendu via t('categories.*') et t('home.svc*')
// Couleurs : palette unique « Chaux & Zellige » (components/icons → CATEGORY_COLOR)
const SVC = [
  {id:'plomberie',u:true},
  {id:'electricite',u:true},
  {id:'serrurerie',u:true},
  {id:'menage'},
  {id:'peinture'},
  {id:'demenagement'},
  {id:'jardinage'},
  {id:'informatique'},
  {id:'coiffure'},
].map(s=>({...s,color:categoryColor(s.id)}))
const NEED_KEYS = ['need1','need2','need3','need4','need5','need6','need7','need8']

function Stars({r,s=12}:{r:number;s?:number}){return<div role="img" aria-label={`${(r||0).toFixed(1)} / 5`} style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><svg key={i} aria-hidden width={s} height={s} viewBox="0 0 24 24" fill={i<=Math.round(r)?'var(--star)':'var(--border2)'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

export default function Home(){
  const router=useRouter()
  const {t,isAr}=useLang()
  const [dark,setDark]=useState(false)
  const [artisans,setArtisans]=useState<Artisan[]>([])
  const [loading,setLoading]=useState(true)
  const [cat,setCat]=useState('')
  const [loc,setLoc]=useState({lat:36.7538,lng:3.0588})
  const [addr,setAddr]=useState('')
  const [locating,setLocating]=useState(true)
  const [sort,setSort]=useState<'distance'|'rating'|'price_asc'|'price_desc'|'missions'>('distance')
  const [show,setShow]=useState(6)
  const [tags,setTags]=useState<string[]>([])
  const [sel,setSel]=useState<Artisan|null>(null)
  const [revs,setRevs]=useState<Review[]>([])
  const [loadR,setLoadR]=useState(false)
  const [user,setUser]=useState<any>(null)
  const [sent,setSent]=useState(false)

  // Theme — dark par défaut
  useEffect(()=>{
    const saved=localStorage.getItem('beti-theme')
    setDark(saved==='dark')
  },[])
  const toggleTheme=()=>{const next=!dark;setDark(next);localStorage.setItem('beti-theme',next?'dark':'light');document.documentElement.setAttribute('data-theme',next?'dark':'light')}

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{if(data.user)setUser(data.user)})
    if(navigator.geolocation){navigator.geolocation.getCurrentPosition(async p=>{setLoc({lat:p.coords.latitude,lng:p.coords.longitude});setLocating(false);try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.coords.latitude}&lon=${p.coords.longitude}&format=json&accept-language=fr`);const d=await r.json();setAddr(d.address?.road?`${d.address.road}, ${d.address.city||d.address.town||''}`:d.address?.city||'Alger')}catch{setAddr('Alger')}},()=>{setLocating(false);setAddr('Alger')})}else{setLocating(false);setAddr('Alger')}
  },[])

  useEffect(()=>{loadA();setShow(6)},[loc,cat,tags])

  // Révélation au scroll : chaque section .reveal-on-scroll monte en fondu la
  // première fois qu'elle entre dans le viewport (rythme Linear/Stripe).
  useEffect(()=>{
    const els=document.querySelectorAll('.reveal-on-scroll')
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      els.forEach(el=>el.classList.add('is-visible'));return
    }
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}})
    },{threshold:0.12,rootMargin:'0px 0px -8% 0px'})
    els.forEach(el=>io.observe(el))
    return()=>io.disconnect()
  },[])

  const loadA=async()=>{
    if(cat==='autre'&&tags.length===0){setArtisans([]);setLoading(false);return}
    setLoading(true)
    try{const{data,error}=await supabase.rpc('get_nearby_artisans',{lat:loc.lat,lng:loc.lng,radius_km:50,category_filter:cat||null});if(!error&&data&&data.length>0){
      // Paywall : hors période de lancement, on masque les non-abonnés.
      const plans=await fetchListingPlans((data as any[]).map(a=>a.artisan_id))
      setArtisans((data as Artisan[]).filter(a=>isListed({plan:plans[a.artisan_id]||'free'})));setLoading(false);return
    }}catch{}
    let q=supabase.from('artisans').select('id,category,hourly_rate,is_available,rating_avg,rating_count,total_missions,bio,tags,lat,lng,profiles(full_name,avatar_url)').limit(30)
    if(cat&&cat!=='autre')q=q.eq('category',cat);if(cat==='autre'&&tags.length>0)q=q.overlaps('tags',tags)
    const{data}=await q
    const plans=await fetchListingPlans((data||[]).map((a:any)=>a.id))
    const real:Artisan[]=(data||[]).filter((a:any)=>isListed({plan:plans[a.id]||'free'})).map((a:any)=>({artisan_id:a.id,full_name:a.profiles?.full_name||'Artisan',avatar_url:a.profiles?.avatar_url||null,category:a.category,rating_avg:a.rating_avg||0,rating_count:a.rating_count||0,hourly_rate:a.hourly_rate||0,distance_km:a.lat&&a.lng?haversineKm(loc.lat,loc.lng,a.lat,a.lng):null,is_available:a.is_available,total_missions:a.total_missions||0,bio:a.bio||''}))
    if(cat==='autre'){setArtisans(real);setLoading(false);return}
    // Jamais de faux profils : sans artisan réel, l'écran vide invite les artisans à s'inscrire.
    setArtisans(real);setLoading(false)
  }
  const openA=async(a:Artisan)=>{setSel(a);setLoadR(true);setSent(false);const{data}=await supabase.from('reviews').select('id,rating,comment,created_at,photos,profiles!reviews_client_id_fkey(full_name)').eq('artisan_id',a.artisan_id).order('created_at',{ascending:false}).limit(20);setRevs((data||[])as any);setLoadR(false)}
  const [contactErr,setContactErr]=useState("")
  const [booking,setBooking]=useState(false)
  // Panneau artisan : fermeture à la touche Échap (hors tunnel de réservation)
  useEffect(()=>{
    if(!sel||booking)return
    const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setSel(null)}
    window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)
  },[sel,booking])
  const contact=async(ty:"message"|"call")=>{
    if(!user||!sel){router.push('/auth/login?next='+encodeURIComponent(window.location.pathname));return}
    setContactErr("");setSent(false)
    if(isDemoArtisan(sel.artisan_id)){setContactErr(t('contact.demoProfile'));return}
    if(ty==='message'){setBooking(true);return}
    const res=await contactArtisan({clientId:user.id,artisanId:sel.artisan_id,category:sel.category,address:addr,hourlyRate:sel.hourly_rate,type:ty})
    if(!res.ok){setContactErr(res.message);return}
    setSent(true)
  }

  // (Le halo « verre liquide » qui suit le curseur est géré globalement par
  //  components/GlassHover, monté dans le layout → actif sur toutes les pages.)


  const cc=(id:string)=>categoryColor(id)
  const cl=(id:string)=>t(`categories.${id}`)
  const svcDesc=(id:string)=>t(`home.svc${id[0].toUpperCase()}${id.slice(1)}`)
  const ta=(d:string)=>{const x=Math.floor((Date.now()-new Date(d).getTime())/86400000);return x===0?t('common.today'):x===1?t('common.yesterday'):x<7?`${x}${t('common.daysShort')}`:x<30?`${Math.floor(x/7)} ${t('common.weeksShort')}`:`${Math.floor(x/30)} ${t('common.monthsShort')}`}
  const sorted=[...artisans].sort((a,b)=>{if(sort==='distance')return(a.distance_km||99)-(b.distance_km||99);if(sort==='rating')return(b.rating_avg||0)-(a.rating_avg||0);if(sort==='price_asc')return(a.hourly_rate||0)-(b.hourly_rate||0);if(sort==='price_desc')return(b.hourly_rate||0)-(a.hourly_rate||0);return(b.total_missions||0)-(a.total_missions||0)})
  const vis=sorted.slice(0,show)

  return(
    <>
      <style suppressHydrationWarning>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes slideInRtl{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-6px)}}
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        #services,#artisans,#comment{scroll-margin-top:100px}
        /* Boutons/chips/labels/cartes vivent dans globals.css (système global unique). */
        .badge{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
        .tag{padding:4px 10px;border-radius:var(--r-chip);background:var(--bg);border:1px solid var(--border);font-size:11px;color:var(--tx2);font-weight:500;white-space:nowrap}
        .board-row{transition:background .2s ease}
        .board-row:hover{background:color-mix(in srgb,var(--accent) 5%,transparent)}
        .foot-link{display:block;font-size:13px;color:var(--tx2);text-decoration:none;margin-bottom:10px;width:fit-content}
        .foot-link:hover{color:var(--accent)}
        .foot-h{font-size:11px;color:var(--tx);font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px}
        .skel-card{border-radius:20px;overflow:hidden;background:var(--bg2);border:1px solid var(--border)}
      `}</style>

      {/* ── EXPÉRIENCE CINÉMATIQUE 3D (première visite desktop) ── */}
      <CinematicGate />

      <div style={{minHeight:'100vh',paddingTop:52,transition:'background 0.4s',direction:isAr?'rtl':'ltr'}}>

        {/* ── THEME TOGGLE (floating) ── */}
        <button onClick={toggleTheme} className="desktop-only" style={{position:'fixed',bottom:24,insetInlineEnd:24,zIndex:200,width:44,height:44,borderRadius:'50%',background:'var(--bg2)',border:'1px solid var(--border)',boxShadow:'var(--card-shadow)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,transition:'all 0.3s'}}
          title={dark?t('home.themeLight'):t('home.themeDark')} aria-label={dark?t('home.themeLight'):t('home.themeDark')}>
          {dark?<Sun size={18} color="var(--tx2)" strokeWidth={1.9}/>:<Moon size={17} color="var(--tx2)" strokeWidth={1.9}/>}
        </button>

        {/* ── ACCUEIL MOBILE (app native, < 768px) ── */}
        <MobileHome
          artisans={artisans} loading={loading}
          cat={cat} setCat={setCat} tags={tags} setTags={setTags}
          addr={addr} locating={locating} openA={openA}
          userName={user?.user_metadata?.full_name||null}
        />

        {/* ── ACCUEIL DESKTOP ── */}
        <div className="desktop-only" style={{display:'block'}}>

        {/* ── HERO — layout asymétrique : accroche à gauche, registre d'artisans
             « en ce moment » à droite. Volontairement PAS un hero centré (pill +
             titre dégradé + 3 badges) : le produit (de vrais artisans de vrais
             quartiers) EST l'image de marque. ── */}
        <section style={{position:'relative',maxWidth:1180,margin:'0 auto',padding:'72px 24px 60px'}}>
          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.05fr) minmax(0,0.95fr)',gap:56,alignItems:'center'}} className="grid-collapse">

            {/* Colonne accroche */}
            <div style={{maxWidth:520}}>
              <div className="mono" style={{fontSize:12,letterSpacing:'0.06em',color:'var(--tx2)',display:'flex',alignItems:'center',gap:10,marginBottom:22}}>
                <span style={{width:22,height:1,background:'var(--tx3)'}}/>{t('home.heroKicker')}
              </div>
              <h1 className="display" style={{fontSize:'clamp(2.5rem,4.6vw,3.7rem)',lineHeight:1.02,letterSpacing:'-0.035em',margin:0}}>
                {t('home.heroT1')}<br/><span style={{color:'var(--accent)'}}>{t('home.heroT2')}</span>
              </h1>
              <p style={{fontSize:16.5,color:'var(--tx2)',lineHeight:1.65,margin:'22px 0 32px',maxWidth:440}}>
                {t('home.heroLead')}
              </p>
              <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
                <button onClick={()=>{setCat('');document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'})}}
                  className="btn-primary" style={{padding:'15px 26px',fontSize:15}}>{t('mhome.ctaFind')}</button>
                <a href="/auth/signup" className="btn-ghost" style={{padding:'15px 26px',fontSize:15}}>{t('mhome.ctaArtisan')}</a>
                <a href="/map" style={{fontSize:14,fontWeight:600,color:'var(--tx)',textDecoration:'none',borderBottom:'2px solid var(--accent)',paddingBottom:2}}>{t('nav.map')}</a>
              </div>
            </div>

            {/* Registre « en ce moment » — bordé, sans ombre ni coins ronds : un
                tableau d'atelier, pas une carte glossy. */}
            <div style={{border:'1px solid var(--border2)',background:'var(--bg2)',borderRadius:4}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid var(--border2)'}}>
                <span className="mono" style={{fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--tx2)'}}>{t('home.heroBoard')} · Alger</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--success)',fontWeight:600}}>
                  <span className="anim-pulse" style={{width:7,height:7,borderRadius:'50%',background:'var(--success)'}}/>live
                </span>
              </div>
              {[
                {name:'Karim B.',cat:'plomberie',zone:'Bab El Oued',r:4.9},
                {name:'Amina K.',cat:'menage',zone:'Hydra',r:5.0},
                {name:'Sofiane A.',cat:'electricite',zone:'Kouba',r:4.8},
                {name:'Riad H.',cat:'serrurerie',zone:'El Biar',r:4.6},
                {name:'Lina H.',cat:'coiffure',zone:'Belouizdad',r:4.9},
              ].map((a,i)=>{const c=cc(a.cat);const go=()=>{setCat(a.cat);document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'})};return(
                <div key={a.name} onClick={go} {...pressable(go)} className="board-row"
                  style={{display:'grid',gridTemplateColumns:'40px 1fr auto',alignItems:'center',gap:14,padding:'12px 18px',borderTop:i===0?'none':'1px solid var(--border)',cursor:'pointer'}}>
                  <div style={{position:'relative',width:40,height:40}}>
                    <img src={artisanAvatar(null,a.name)} alt="" loading="lazy" decoding="async" width={40} height={40} style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',background:'var(--bg3)',border:`2px solid ${c}`}}/>
                    <span style={{position:'absolute',insetInlineEnd:-2,bottom:-2,width:14,height:14,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg2)',border:`1px solid ${c}44`}}>
                      <CategoryIcon id={a.cat} size={9} color={c} strokeWidth={2.2}/>
                    </span>
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.name} <span style={{color:'var(--tx3)',fontWeight:400}}>· {cl(a.cat)}</span></div>
                    <div style={{fontSize:12,color:'var(--tx2)'}}>{a.zone}</div>
                  </div>
                  <div style={{textAlign:'end'}}>
                    <div className="mono" style={{fontSize:13,fontWeight:600,color:'var(--laiton)'}}>★ {a.r.toFixed(1)}</div>
                    <div className="mono" style={{fontSize:10,letterSpacing:'0.06em',color:'var(--success)',textTransform:'uppercase'}}>{t('home.heroDispo')}</div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="services" className="reveal-on-scroll" style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 28px'}}>
          <div style={{marginBottom:24,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><div className="section-label">{t('home.servicesTag')}</div><h2 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.servicesTitle')}</h2></div>{cat!==''&&<button type="button" className="btn-ghost" onClick={()=>{setCat('');setTags([])}}>{t('home.allServices')}</button>}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14}}>
            {SVC.map(s=>(
              <CategoryCard key={s.id} id={s.id} label={cl(s.id)} desc={svcDesc(s.id)} active={cat===s.id}
                badge={s.u?t('home.urgent'):undefined}
                onClick={()=>{setCat(s.id);document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'})}} />
            ))}
            <CategoryCard id="autre" label={t('home.otherService')} desc={t('home.otherServiceSub')} active={cat==='autre'}
              onClick={()=>{setCat('autre');setTags([])}} />
          </div>
          {cat==='autre'&&(<div style={{maxWidth:540,margin:'16px auto 0',animation:'fadeUp 0.3s ease'}}><OtherCategorySearch onSearch={kw=>{const t=kw.trim().split(/\s+/).filter(Boolean);setTags(t);if(t.length>0)setTimeout(()=>document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'}),200)}}/>{tags.length===0&&<p style={{textAlign:'center',fontSize:12.5,color:'var(--tx2)',marginTop:12}}>{t('home.otherHint')}</p>}</div>)}
        </section>

        {/* ── ARTISANS ── */}
        <section id="artisans" className="reveal-on-scroll" style={{maxWidth:1100,margin:'0 auto',padding:'20px 24px 56px'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div><div className="section-label">{t('home.artisansTag')}</div><h2 style={{fontSize:20,fontWeight:800,letterSpacing:'-0.01em'}}>{loading?t('home.searching'):artisans.length===0&&cat==='autre'&&tags.length===0?t('home.addKeywords'):`${artisans.length} ${cat&&cat!=='autre'?cl(cat)+' — ':''}${artisans.length>1?t('home.artisansNear'):t('home.artisanNear')}`}</h2></div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              {(['distance','rating','price_asc','price_desc','missions'] as const).map(s=>(
                <button key={s} onClick={()=>setSort(s)} aria-pressed={sort===s} className={`chip${sort===s?' chip-active':''}`} style={{padding:'7px 14px',fontSize:12}}>
                  {({distance:t('home.sortDistance'),rating:t('home.sortRating'),price_asc:t('home.sortPriceAsc'),price_desc:t('home.sortPriceDesc'),missions:t('home.sortExp')} as any)[s]}
                </button>
              ))}
              <div style={{width:1,height:14,background:'var(--border)',margin:'0 6px'}}/>
              <a href="/map" className="chip" style={{textDecoration:'none',fontSize:12,padding:'7px 14px'}}><MapPinned size={13} strokeWidth={2}/>{t('nav.map')}</a>
            </div>
          </div>

          {loading?(
            <div aria-busy="true" aria-label={t('home.searching')} style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
              {[1,2,3,4,5,6].map(i=>(
                <div key={i} className="skel-card">
                  <div className="skeleton" style={{height:130,borderRadius:0,display:'flex',alignItems:'center',justifyContent:'center'}}/>
                  <div style={{padding:'16px 20px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                    <div className="skeleton" style={{width:'52%',height:16}}/>
                    <div className="skeleton" style={{width:'40%',height:12}}/>
                    <div className="skeleton" style={{width:'64%',height:11}}/>
                    <div style={{width:'100%',height:1,background:'var(--border)',margin:'6px 0'}}/>
                    <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div className="skeleton" style={{width:90,height:26}}/>
                      <div className="skeleton" style={{width:104,height:40,borderRadius:'var(--r-btn)'}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ):artisans.length===0?(
            cat==='autre'&&tags.length===0?null:(
            <div className="empty-state">
              <div className="empty-icon"><SearchX size={26} strokeWidth={1.6}/></div>
              <div className="empty-title">{cat==='autre'?t('home.noKeywordResults'):t('home.noArtisan')}</div>
              <button onClick={()=>{setCat('');setTags([])}} className="btn-primary" style={{marginTop:14}}>{t('home.seeAll')}</button>
              <a href="/auth/signup?role=artisan" className="btn-ghost" style={{marginTop:10}}>{t('mhome.ctaArtisan')}</a>
            </div>)
          ):(
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
                {vis.map((a,i)=>{const c=cc(a.category);const init=a.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'A'
                  // Temps de réponse indicatif STABLE (dérivé de l'id — pas de Math.random
                  // qui changerait à chaque re-render sous les yeux de l'utilisateur)
                  return(
                    <div key={a.artisan_id} onClick={()=>openA(a)} {...pressable(()=>openA(a))} aria-label={`${a.full_name} — ${cl(a.category)}`} className="acard"
                      style={{borderRadius:20,cursor:'pointer',overflow:'hidden',opacity:a.is_available?1:0.62,position:'relative',animation:`fadeUp 0.5s ease ${Math.min(i,8)*0.06}s both`}}>

                      {/* Bandeau teinté + avatar centré */}
                      <div style={{position:'relative',height:130,background:`linear-gradient(160deg, ${c}26, var(--bg2) 68%)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <img src={artisanAvatar(a.avatar_url,a.artisan_id)} alt="" loading="lazy" decoding="async" width={76} height={76} style={{width:76,height:76,borderRadius:18,objectFit:'cover',background:'var(--bg3)',border:`3px solid ${c}`,boxShadow:`0 8px 24px -8px ${c}66`,zIndex:1}}/>
                        {/* Pastilles */}
                        <div style={{position:'absolute',top:12,insetInlineEnd:14}}>
                          {a.is_available
                            ? <span className="badge-tone tone-success" style={{background:'var(--bg2)'}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--success)'}}/>{t('common.online')}</span>
                            : <span className="badge-tone tone-muted">{t('common.offline')}</span>}
                        </div>
                        <div className="badge-tone" style={{position:'absolute',top:12,insetInlineStart:14,background:'var(--bg2)',border:`1px solid ${c}40`,color:categoryInk(a.category)}}>{cl(a.category)}</div>
                      </div>

                      {/* Contenu */}
                      <div style={{padding:'16px 20px 20px',textAlign:'center'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:6}}>
                          <span style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{a.full_name}</span>
                          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        </div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:14}}>
                          <Stars r={a.rating_avg} s={13}/><span className="num" style={{fontSize:14,fontWeight:700,color:'var(--laiton)'}}>{a.rating_avg?.toFixed(1)}</span><span style={{fontSize:12,color:'var(--tx3)'}}>({a.rating_count} {t('common.reviews')})</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:18,fontSize:12.5,color:'var(--tx2)',flexWrap:'wrap'}}>
                          <span>{a.distance_km!=null?`${a.distance_km.toFixed(1)} ${t('common.km')}`:'—'}</span><span aria-hidden style={{color:'var(--tx3)'}}>·</span>
                          <span>{a.total_missions} {t('common.missions')}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:16,borderTop:'1px solid var(--border)'}}>
                          <div style={{textAlign:'start'}}>
                            <div style={{fontSize:11,color:'var(--tx3)',marginBottom:2}}>{t('home.fromPrice')}</div>
                            <div className="num" style={{fontSize:22,fontWeight:700,color:'var(--tx)'}}>{(a.hourly_rate||0).toLocaleString('fr-DZ')} <span style={{fontSize:12,fontWeight:400,color:'var(--tx3)'}}>{t('common.da')}</span></div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();openA(a)}} className="btn-primary" style={{padding:'10px 22px',fontSize:13}}>{t('home.contact')}</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {sorted.length>show&&(<div style={{display:'flex',justifyContent:'center',marginTop:28}}><button onClick={()=>setShow(p=>p+6)} className="btn-ghost">{t('home.showMore')} ({sorted.length-show} {t('home.remaining')})</button></div>)}
            </>
          )}
        </section>

        {/* ── COMMENT ÇA MARCHE ── */}
        <section id="comment" className="reveal-on-scroll" style={{padding:'56px 24px 72px',maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:44}}><div className="section-label">{t('home.howTag')}</div><h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.howTitle')}</h2></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'28px 18px'}}>
            {[{n:'01',k:'step1',Icon:Search},{n:'02',k:'step2',Icon:CalendarCheck},{n:'03',k:'step3',Icon:CheckCircle2}].map((s,i)=>(
              <div key={s.n} style={{position:'relative',padding:'0 8px'}}>
                {/* Trait de liaison vers l'étape suivante (desktop) — pointillé « cordeau » */}
                {i<2&&<div aria-hidden className="desktop-only" style={{position:'absolute',top:27,insetInlineStart:78,insetInlineEnd:-10,height:0,borderTop:'2px dashed color-mix(in srgb, var(--accent) 35%, transparent)',pointerEvents:'none'}}/>}
                <div style={{position:'relative',width:54,height:54,borderRadius:15,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--accent-fill)',boxShadow:'0 2px 0 color-mix(in srgb, var(--accent-fill) 55%, #000), 0 12px 24px -12px var(--accent-fill)',marginBottom:20,zIndex:1}}>
                  <s.Icon size={25} color="var(--on-accent)" strokeWidth={2}/>
                  <span className="num" style={{position:'absolute',top:-8,insetInlineEnd:-8,minWidth:22,height:22,padding:'0 5px',borderRadius:11,background:'var(--bg2)',border:'1px solid var(--border2)',color:'var(--accent)',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.n}</span>
                </div>
                <h3 style={{fontSize:17,fontWeight:800,marginBottom:9}}>{t(`home.${s.k}t`)}</h3>
                <div style={{fontSize:14,color:'var(--tx2)',lineHeight:1.7}}>{t(`home.${s.k}d`)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── POURQUOI BETI ── */}
        <section className="reveal-on-scroll" style={{padding:'64px 24px',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:40}}>
              <div className="section-label">{t('home.whyTag')}</div>
              <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.whyTitle')}</h2>
              <p style={{fontSize:15,color:'var(--tx2)',maxWidth:460,margin:'12px auto 0',lineHeight:1.7}}>{t('home.whySub')}</p>
            </div>
            {/* Liste de bénéfices à filets — volontairement « plate » pour trancher
                avec les cartes des sections interactives. */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'0 40px'}}>
              {['why1','why2','why3','why4','why5','why6'].map(k=>(
                <div key={k} style={{display:'flex',gap:14,padding:'20px 2px',borderTop:'1px solid var(--border)'}}>
                  <div aria-hidden style={{flexShrink:0,width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'color-mix(in srgb, var(--accent) 9%, transparent)',border:'1px solid color-mix(in srgb, var(--accent) 22%, transparent)'}}>
                    <div style={{width:9,height:9,background:'var(--accent)',clipPath:'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)'}}/>
                  </div>
                  <div>
                    <h3 style={{fontSize:15,fontWeight:800,marginBottom:5}}>{t(`home.${k}t`)}</h3>
                    <div style={{fontSize:13.5,color:'var(--tx2)',lineHeight:1.7}}>{t(`home.${k}d`)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ARTISAN ── */}
        <section className="reveal-on-scroll" style={{padding:'0 24px 80px',maxWidth:1100,margin:'0 auto'}}>
          <div className="card" style={{padding:'56px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:40,flexWrap:'wrap',position:'relative',overflow:'hidden',borderColor:'color-mix(in srgb, var(--accent) 25%, var(--border))'}}>
            <div aria-hidden style={{position:'absolute',insetInlineEnd:-30,top:'50%',transform:'translateY(-50%)',fontSize:200,fontWeight:800,color:'var(--accent)',opacity:0.04,pointerEvents:'none',lineHeight:1}}>BETI</div>
            <div style={{position:'relative',maxWidth:480}}>
              <div className="section-label">{t('home.ctaTag')}</div>
              <h2 style={{fontSize:30,fontWeight:800,marginBottom:14,lineHeight:1.2,letterSpacing:'-0.02em'}}>{t('home.ctaTitle')}</h2>
              <p style={{fontSize:15,color:'var(--tx2)',lineHeight:1.7,marginBottom:24}}>{t('home.ctaSub')}</p>
              <div style={{display:'flex',gap:'10px 18px',flexWrap:'wrap'}}>
                {['ctaB1','ctaB2','ctaB3','ctaB4'].map(b=>(<div key={b} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--tx2)'}}><svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>{t(`home.${b}`)}</div>))}
              </div>
            </div>
            <a href="/auth/signup" className="btn-primary btn-lg" style={{position:'relative',padding:'16px 40px'}}>{t('home.ctaBtn')}</a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="desktop-only" style={{background:'var(--bg3)',borderTop:'1px solid var(--border)',padding:'48px 40px 28px'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:32,marginBottom:40}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <LogoMark size={24} />
                  <span style={{fontSize:14,fontWeight:800,letterSpacing:'0.12em'}}>BETI</span>
                </div>
                <p style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7,maxWidth:240}}>{t('home.footerDesc')}</p>
              </div>
              <nav aria-label={t('home.footerServices')}><div className="foot-h">{t('home.footerServices')}</div>{['plomberie','electricite','serrurerie','menage','peinture','demenagement'].map(s=><a key={s} href="/#services" className="foot-link">{cl(s)}</a>)}</nav>
              <nav aria-label={t('home.footerPlatform')}><div className="foot-h">{t('home.footerPlatform')}</div>{[{l:t('home.footerHow'),h:'/#comment'},{l:t('nav.map'),h:'/map'},{l:t('home.footerBecome'),h:'/auth/signup'},{l:t('nav.login'),h:'/auth/login'}].map(s=><a key={s.l} href={s.h} className="foot-link">{s.l}</a>)}</nav>
              <nav aria-label={t('home.footerSupport')}><div className="foot-h">{t('home.footerSupport')}</div>{[{l:t('nav.help'),h:'/aide'},{l:t('nav.settings'),h:'/parametres'},{l:t('home.footerLegal'),h:'/mentions'},{l:t('home.footerCgu'),h:'/cgu'},{l:t('home.footerPrivacy'),h:'/confidentialite'}].map(s=><a key={s.l} href={s.h} className="foot-link">{s.l}</a>)}</nav>
            </div>
            <div style={{height:1,background:'var(--border)',marginBottom:20}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
              <span style={{fontSize:12,color:'var(--tx3)'}}>{t('home.footerCopy')}</span>
              <button onClick={toggleTheme} className="foot-link" style={{margin:0,background:'transparent',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,fontSize:12}}>{dark?<Sun size={13}/>:<Moon size={13}/>}{dark?t('home.themeLight'):t('home.themeDark')}</button>
            </div>
          </div>
        </footer>

        </div>{/* /desktop-only */}
      </div>

      {/* ── PANEL ── */}
      {sel&&(<div role="dialog" aria-modal="true" aria-label={sel.full_name} style={{position:'fixed',inset:0,zIndex:300,display:'flex',direction:isAr?'rtl':'ltr'}}>
        <div onClick={()=>setSel(null)} style={{position:'absolute',inset:0,background:'var(--overlay)'}}/>
        <div className="detail-sheet" style={{position:'absolute',insetInlineEnd:0,top:0,bottom:0,width:'100%',maxWidth:440,background:'var(--bg)',borderInlineStart:'1px solid var(--border)',overflowY:'auto',animation:`${isAr?'slideInRtl':'slideIn'} 0.35s cubic-bezier(0.4,0,0.2,1)`}}>
          <div style={{padding:'22px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:14}}>
            <img src={artisanAvatar(sel.avatar_url,sel.artisan_id)} alt="" loading="lazy" decoding="async" width={56} height={56} style={{width:56,height:56,borderRadius:16,objectFit:'cover',background:'var(--bg3)',border:`2px solid ${cc(sel.category)}`}}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:18,fontWeight:800}}>{sel.full_name}</div><div style={{fontSize:12,color:categoryInk(sel.category),fontWeight:700,marginBottom:4}}>{cl(sel.category)}</div><div style={{display:'flex',alignItems:'center',gap:5}}><Stars r={sel.rating_avg} s={12}/><span className="num" style={{fontSize:12.5,fontWeight:700,color:'var(--laiton)'}}>{sel.rating_avg?.toFixed(1)}</span><span style={{fontSize:12,color:'var(--tx3)'}}>({sel.rating_count})</span></div></div>
            <button onClick={()=>setSel(null)} className="icon-btn" aria-label={isAr?'إغلاق':'Fermer'}><X size={20}/></button>
          </div>
          <div style={{padding:'16px 24px',display:'flex',gap:10,borderBottom:'1px solid var(--border)'}}>
            {[{v:`${(sel.hourly_rate||0).toLocaleString('fr-DZ')} ${t('common.da')}`,l:t('booking.rate')},{v:sel.distance_km!=null?`${sel.distance_km.toFixed(1)} ${t('common.km')}`:'—',l:t('home.sortDistance')},{v:sel.total_missions.toString(),l:t('profile.missions')}].map(s=>(
              <div key={s.l} style={{flex:1,textAlign:'center',padding:'12px 8px',background:'var(--bg2)',borderRadius:'var(--r-card)',border:'1px solid var(--border)'}}><div className="num" style={{fontSize:15,fontWeight:700}}>{s.v}</div><div style={{fontSize:11.5,color:'var(--tx2)',marginTop:2}}>{s.l}</div></div>
            ))}
          </div>
          <div style={{padding:'16px 24px',display:'flex',flexDirection:'column',gap:10,borderBottom:'1px solid var(--border)'}}>
            {contactErr&&<div role="alert" className="tone-danger" style={{padding:'10px 14px',borderRadius:'var(--r-field)',fontSize:13}}>{contactErr}</div>}
            {sent?<div role="status" className="tone-success" style={{padding:14,borderRadius:'var(--r-card)',textAlign:'center',fontSize:14,fontWeight:700}}>{t('home.panelSent')}</div>:(
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>contact('message')} className="btn-primary" style={{flex:1}}>{t('home.sendMessage')}</button>
              <button onClick={()=>contact('call')} className="btn-ghost btn-call" style={{padding:'12px 20px'}}>{t('home.call')}</button>
            </div>)}
          </div>
          <div style={{padding:'18px 24px'}}>
            <h3 style={{fontSize:15,fontWeight:800,marginBottom:14}}>{t('profile.reviews')} ({revs.length})</h3>
            {loadR?<div aria-busy="true" style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:72,borderRadius:'var(--r-card)'}}/>)}</div>:revs.length===0?<div style={{textAlign:'center',padding:'28px 12px',color:'var(--tx2)',fontSize:13.5,background:'var(--bg2)',border:'1px dashed var(--border2)',borderRadius:'var(--r-card)'}}>{t('home.noReviews')}</div>:
              <div style={{display:'flex',flexDirection:'column',gap:8}}>{revs.map(r=>(
                <div key={r.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r-card)',padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}><div aria-hidden style={{width:28,height:28,borderRadius:'50%',background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--tx2)'}}>{(r.profiles?.full_name||'C')[0]}</div><div><div style={{fontSize:13,fontWeight:700}}>{r.profiles?.full_name||'Client'}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{ta(r.created_at)}</div></div></div>
                    <Stars r={r.rating} s={11}/>
                  </div>
                  {r.comment&&<p style={{fontSize:13,color:'var(--tx2)',lineHeight:1.6}}>{r.comment}</p>}
                </div>
              ))}</div>}
          </div>
          <div style={{padding:'14px 24px 32px'}}><button onClick={()=>router.push(`/artisan/${sel.artisan_id}`)} className="btn-ghost" style={{width:'100%'}}>{t('home.fullProfile')}</button></div>
        </div>
      </div>)}

      {booking&&user&&sel&&(
        <BookingFlow
          artisan={{id:sel.artisan_id,name:sel.full_name,category:sel.category,hourlyRate:sel.hourly_rate||0,color:cc(sel.category)}}
          clientId={user.id}
          defaultAddress={addr}
          onClose={()=>setBooking(false)}
        />
      )}
    </>
  )
}
