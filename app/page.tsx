'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { haversineKm } from '@/lib/distance'
import { contactArtisan } from '@/lib/contactArtisan'
import { OtherCategorySearch } from '@/components/OtherCategory'
import { useLang } from '@/lib/LangContext'
import { CategoryIcon } from '@/components/icons'
import { LayoutGrid } from 'lucide-react'
import MobileHome from '@/components/MobileHome'

type Artisan = { artisan_id:string;full_name:string;avatar_url:string|null;category:string;rating_avg:number;rating_count:number;hourly_rate:number;distance_km:number|null;is_available:boolean;total_missions:number;bio?:string;phone?:string }
type Review = { id:string;rating:number;comment:string|null;created_at:string;photos?:string[];profiles?:{full_name:string}|null }

// Libellés/descriptions traduits au rendu via t('categories.*') et t('home.svc*')
const SVC = [
  {id:'plomberie',color:'#3b82f6',u:true},
  {id:'electricite',color:'#f59e0b',u:true},
  {id:'serrurerie',color:'#ef4444',u:true},
  {id:'menage',color:'#10b981'},
  {id:'peinture',color:'#f97316'},
  {id:'demenagement',color:'#8b5cf6'},
  {id:'jardinage',color:'#22c55e'},
  {id:'informatique',color:'#6366f1'},
  {id:'coiffure',color:'#ec4899'},
]
const NEED_KEYS = ['need1','need2','need3','need4','need5','need6','need7','need8']
const TESTI = [
  {name:'Samira B.',city:'Alger',k:'testi1',r:5,s:'plomberie'},
  {name:'Mehdi K.',city:'Oran',k:'testi2',r:5,s:'demenagement'},
  {name:'Fatima Z.',city:'Constantine',k:'testi3',r:4,s:'menage'},
  {name:'Youcef A.',city:'Blida',k:'testi4',r:5,s:'electricite'},
]
const DEMO:Artisan[] = [
  {artisan_id:'d1',full_name:'Karim Benali',avatar_url:null,category:'plomberie',rating_avg:4.9,rating_count:84,hourly_rate:3500,distance_km:1.2,is_available:true,total_missions:312},
  {artisan_id:'d2',full_name:'Sofiane Amrani',avatar_url:null,category:'electricite',rating_avg:4.8,rating_count:127,hourly_rate:4000,distance_km:2.8,is_available:true,total_missions:198},
  {artisan_id:'d3',full_name:'Amina Kaci',avatar_url:null,category:'menage',rating_avg:5.0,rating_count:211,hourly_rate:2000,distance_km:0.9,is_available:true,total_missions:521},
  {artisan_id:'d4',full_name:'Riad Hamdi',avatar_url:null,category:'serrurerie',rating_avg:4.6,rating_count:48,hourly_rate:4500,distance_km:4.2,is_available:true,total_missions:89},
  {artisan_id:'d5',full_name:'Lina Hadj',avatar_url:null,category:'coiffure',rating_avg:4.9,rating_count:189,hourly_rate:2500,distance_km:2.1,is_available:true,total_missions:347},
  {artisan_id:'d6',full_name:'Rachid Taleb',avatar_url:null,category:'demenagement',rating_avg:4.6,rating_count:67,hourly_rate:5000,distance_km:4.5,is_available:true,total_missions:156},
  {artisan_id:'d7',full_name:'Fatima Zohra',avatar_url:null,category:'menage',rating_avg:4.8,rating_count:156,hourly_rate:1800,distance_km:1.8,is_available:true,total_missions:423},
  {artisan_id:'d8',full_name:'Walid Benmoussa',avatar_url:null,category:'informatique',rating_avg:4.8,rating_count:52,hourly_rate:4500,distance_km:5.6,is_available:true,total_missions:87},
  {artisan_id:'d9',full_name:'Mourad Khelifi',avatar_url:null,category:'serrurerie',rating_avg:4.9,rating_count:114,hourly_rate:5500,distance_km:2.3,is_available:true,total_missions:278},
  {artisan_id:'d10',full_name:'Omar Belkacemi',avatar_url:null,category:'electricite',rating_avg:4.5,rating_count:91,hourly_rate:3800,distance_km:3.5,is_available:true,total_missions:201},
  {artisan_id:'d11',full_name:'Nassim Cherif',avatar_url:null,category:'jardinage',rating_avg:4.4,rating_count:45,hourly_rate:2500,distance_km:7.8,is_available:true,total_missions:112},
  {artisan_id:'d12',full_name:'Yacine Meziane',avatar_url:null,category:'peinture',rating_avg:4.7,rating_count:63,hourly_rate:3000,distance_km:3.1,is_available:true,total_missions:145},
]

function Stars({r,s=12}:{r:number;s?:number}){return<div style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(i=><svg key={i} width={s} height={s} viewBox="0 0 24 24" fill={i<=Math.round(r)?'#f59e0b':'var(--border)'}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

export default function Home(){
  const router=useRouter()
  const {t,isAr}=useLang()
  const [dark,setDark]=useState(true)
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
  const [cnt,setCnt]=useState({a:0,b:0,c:0,d:0})
  const sr=useRef<HTMLDivElement>(null);const sa=useRef(false)

  // Theme — dark par défaut
  useEffect(()=>{
    const saved=localStorage.getItem('beti-theme')
    if(saved==='light')setDark(false)
  },[])
  const toggleTheme=()=>{const next=!dark;setDark(next);localStorage.setItem('beti-theme',next?'dark':'light');document.documentElement.setAttribute('data-theme',next?'dark':'light')}

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{if(data.user)setUser(data.user)})
    if(navigator.geolocation){navigator.geolocation.getCurrentPosition(async p=>{setLoc({lat:p.coords.latitude,lng:p.coords.longitude});setLocating(false);try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.coords.latitude}&lon=${p.coords.longitude}&format=json&accept-language=fr`);const d=await r.json();setAddr(d.address?.road?`${d.address.road}, ${d.address.city||d.address.town||''}`:d.address?.city||'Alger')}catch{setAddr('Alger')}},()=>{setLocating(false);setAddr('Alger')})}else{setLocating(false);setAddr('Alger')}
  },[])

  useEffect(()=>{loadA();setShow(6)},[loc,cat,tags])

  const loadA=async()=>{
    if(cat==='autre'&&tags.length===0){setArtisans([]);setLoading(false);return}
    setLoading(true)
    try{const{data,error}=await supabase.rpc('get_nearby_artisans',{lat:loc.lat,lng:loc.lng,radius_km:50,category_filter:cat||null});if(!error&&data&&data.length>0){setArtisans(data);setLoading(false);return}}catch{}
    let q=supabase.from('artisans').select('id,category,hourly_rate,is_available,rating_avg,rating_count,total_missions,bio,tags,lat,lng,profiles(full_name,avatar_url,phone)').limit(30)
    if(cat&&cat!=='autre')q=q.eq('category',cat);if(cat==='autre'&&tags.length>0)q=q.overlaps('tags',tags)
    const{data}=await q
    const real:Artisan[]=(data||[]).map((a:any)=>({artisan_id:a.id,full_name:a.profiles?.full_name||'Artisan',avatar_url:a.profiles?.avatar_url||null,category:a.category,rating_avg:a.rating_avg||0,rating_count:a.rating_count||0,hourly_rate:a.hourly_rate||0,distance_km:a.lat&&a.lng?haversineKm(loc.lat,loc.lng,a.lat,a.lng):null,is_available:a.is_available,total_missions:a.total_missions||0,bio:a.bio||'',phone:a.profiles?.phone||null}))
    if(cat==='autre'){setArtisans(real);setLoading(false);return}
    // Démo en SECOURS uniquement : dès qu'il y a de vrais artisans, on n'affiche
    // qu'eux (pas de faux profils mélangés en production).
    if(real.length>0){setArtisans(real);setLoading(false);return}
    const d=cat?DEMO.filter(x=>x.category===cat):DEMO;setArtisans(d);setLoading(false)
  }
  const openA=async(a:Artisan)=>{setSel(a);setLoadR(true);setSent(false);const{data}=await supabase.from('reviews').select('id,rating,comment,created_at,photos,profiles!reviews_client_id_fkey(full_name)').eq('artisan_id',a.artisan_id).order('created_at',{ascending:false}).limit(20);setRevs((data||[])as any);setLoadR(false)}
  const [contactErr,setContactErr]=useState(""); const contact=async(ty:"message"|"call")=>{
    if(!user||!sel){router.push("/auth/login");return}
    setContactErr("");setSent(false)
    const res=await contactArtisan({clientId:user.id,artisanId:sel.artisan_id,category:sel.category,address:addr,hourlyRate:sel.hourly_rate,type:ty})
    if(!res.ok){setContactErr(res.reason==='demo'?t('contact.demoProfile'):res.message);return}
    if(ty==="message")router.push("/chat/"+res.bookingId);else setSent(true)
  }

  useEffect(()=>{const o=new IntersectionObserver(([e])=>{if(e.isIntersecting&&!sa.current){sa.current=true;const t={a:12000,b:98,c:30,d:50};const s=Date.now();const tick=()=>{const p=Math.min((Date.now()-s)/1800,1);const e=1-Math.pow(1-p,3);setCnt({a:Math.floor(e*t.a),b:Math.floor(e*t.b),c:Math.floor(e*t.c),d:Math.floor(e*t.d)});if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}},{threshold:0.3});if(sr.current)o.observe(sr.current);return()=>o.disconnect()},[])

  const cc=(id:string)=>SVC.find(c=>c.id===id)?.color||'#6366f1'
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
        @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-6px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px #6366f133}50%{box-shadow:0 0 20px #6366f155}}
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:var(--bg);color:var(--tx);font-family:Nexa,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;transition:background 0.4s,color 0.4s}
        #services,#artisans,#comment{scroll-margin-top:100px}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--accent)22;border-radius:4px}
        .card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;box-shadow:var(--card-shadow);transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
        .card:hover{transform:translateY(-4px);box-shadow:var(--hover-shadow);border-color:var(--accent)33}
        .acard{transition:all 0.35s cubic-bezier(0.4,0,0.2,1)}
        .acard:hover{transform:translateY(-6px) scale(1.01);box-shadow:var(--hover-shadow-lg);border-color:var(--accent)44}
        .acard:hover::after{content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1px;background:linear-gradient(135deg,var(--accent)44,transparent 50%,transparent);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
        .btn-primary{background:var(--gradient);color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:Nexa,sans-serif;transition:all 0.3s;box-shadow:0 4px 16px #6366f133}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px #6366f155}
        .btn-ghost{background:transparent;color:var(--tx2);border:1px solid var(--border);padding:10px 22px;border-radius:12px;font-size:13px;font-weight:400;cursor:pointer;font-family:Nexa,sans-serif;transition:all 0.25s}
        .btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
        .chip{padding:6px 16px;border-radius:10px;background:var(--bg);border:1px solid var(--border);color:var(--tx2);font-size:12px;font-weight:400;cursor:pointer;font-family:Nexa,sans-serif;transition:all 0.25s;display:flex;align-items:center;gap:6px}
        .chip:hover{border-color:var(--accent)66;color:var(--accent)}
        .chip-active{background:var(--accent)12;border-color:var(--accent);color:var(--accent);font-weight:700}
        .badge{padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:0.04em}
        .section-label{font-size:11px;letter-spacing:0.14em;font-weight:800;background:var(--gradient-text);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
        .tag{padding:4px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);font-size:10px;color:var(--tx3);font-weight:400}
      `}</style>

      <div style={{minHeight:'100vh',paddingTop:52,transition:'background 0.4s',direction:isAr?'rtl':'ltr'}}>

        {/* ── THEME TOGGLE (floating) ── */}
        <button onClick={toggleTheme} className="desktop-only" style={{position:'fixed',bottom:24,right:24,zIndex:200,width:44,height:44,borderRadius:'50%',background:'var(--bg2)',border:'1px solid var(--border)',boxShadow:'var(--card-shadow)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,transition:'all 0.3s'}}
          title={dark?t('home.themeLight'):t('home.themeDark')}>
          {dark?'☀':'☾'}
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

        {/* ── HERO ── */}
        <section style={{position:'relative',padding:'88px 24px 56px',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
            <div style={{position:'absolute',width:700,height:700,background:'radial-gradient(circle,#6366f108 0%,transparent 60%)',top:-300,left:'50%',transform:'translateX(-50%)'}}/>
            <div style={{position:'absolute',width:400,height:400,background:'radial-gradient(circle,#8b5cf608 0%,transparent 60%)',bottom:-200,right:-100}}/>
          </div>

          <div style={{maxWidth:680,margin:'0 auto',textAlign:'center',position:'relative',zIndex:2}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 18px',borderRadius:24,background:'var(--bg2)',border:'1px solid var(--border)',boxShadow:'var(--card-shadow)',fontSize:11,letterSpacing:'.1em',fontWeight:700,marginBottom:28,animation:'fadeUp 0.6s ease'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b98155'}}/>
              <span style={{background:'var(--gradient-text)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{t('home.badge')}</span>
            </div>

            <h1 style={{fontSize:'clamp(2.4rem,5.5vw,3.8rem)',fontWeight:800,lineHeight:1.08,letterSpacing:'-0.03em',marginBottom:20,animation:'fadeUp 0.6s ease 0.1s both'}}>
              {t('home.title1')}<br/>
              <span style={{background:'linear-gradient(135deg,#6366f1,#a78bfa,#6366f1)',backgroundSize:'200% auto',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'shimmer 3s linear infinite'}}>{t('home.title2')}</span>
            </h1>

            <p style={{fontSize:16,color:'var(--tx2)',maxWidth:480,lineHeight:1.8,margin:'0 auto 36px',fontWeight:300,animation:'fadeUp 0.6s ease 0.2s both'}}>
              {t('home.subtitle1')}<br/>{t('home.subtitle2')}
            </p>

            {/* Search */}
            <div className="card" style={{maxWidth:540,margin:'0 auto 20px',padding:'20px 22px',textAlign:'left',animation:'fadeUp 0.6s ease 0.3s both'}}>
              <div style={{fontSize:11,color:'var(--tx3)',fontWeight:700,letterSpacing:'0.08em',marginBottom:12}}>{t('home.needTitle')}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {NEED_KEYS.map(k=>(
                  <button key={k} onClick={()=>{setCat('');document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'})}}
                    className="chip" style={{fontSize:12}}>{t(`home.${k}`)}</button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 20px',borderRadius:12,background:'var(--bg2)',border:'1px solid var(--border)',maxWidth:440,width:'100%',animation:'fadeUp 0.6s ease 0.4s both'}}>
              {locating?<span style={{fontSize:13,color:'var(--tx3)',fontWeight:300}}>{t('home.detecting')}</span>:(
                <>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b98155',flexShrink:0}}/>
                  <input type="text" value={addr} onChange={e=>setAddr(e.target.value)} placeholder={t('home.addressPh')}
                    style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--tx)',fontSize:13,fontFamily:'Nexa,sans-serif',fontWeight:300,minWidth:0}}/>
                </>
              )}
            </div>

            {/* Trust */}
            <div style={{display:'flex',gap:28,justifyContent:'center',marginTop:28,flexWrap:'wrap',animation:'fadeUp 0.6s ease 0.5s both'}}>
              {['trust1','trust2','trust3','trust4'].map(k=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx3)',fontWeight:300}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>{t(`home.${k}`)}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="services" style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 28px'}}>
          <div style={{marginBottom:24}}><div className="section-label">{t('home.servicesTag')}</div><h2 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.servicesTitle')}</h2></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
            <div onClick={()=>{setCat('');document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'})}} className="card" style={{padding:18,cursor:'pointer',borderColor:!cat?'var(--accent)':'var(--border)'}}>
              <div style={{fontSize:20,marginBottom:10,opacity:0.6}}>✳</div>
              <div style={{fontSize:14,fontWeight:700,color:!cat?'var(--accent)':'var(--tx)',marginBottom:4}}>{t('home.allServices')}</div>
              <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300,lineHeight:1.5}}>{t('home.allServicesSub')}</div>
            </div>
            {SVC.map(s=>(
              <div key={s.id} onClick={()=>{setCat(s.id);document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'})}} className="card" style={{padding:18,cursor:'pointer',position:'relative',borderColor:cat===s.id?s.color:'var(--border)'}}>
                {s.u&&<div className="badge" style={{position:'absolute',top:10,right:isAr?'auto':10,left:isAr?10:'auto',background:'#ef444412',color:'#ef4444'}}>{t('home.urgent')}</div>}
                <div style={{marginBottom:10}}><CategoryIcon id={s.id} size={22} color={cat===s.id?s.color:'var(--tx2)'} strokeWidth={1.75}/></div>
                <div style={{fontSize:14,fontWeight:700,color:cat===s.id?s.color:'var(--tx)',marginBottom:4,transition:'color 0.2s'}}>{cl(s.id)}</div>
                <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300,lineHeight:1.5}}>{svcDesc(s.id)}</div>
              </div>
            ))}
            <div onClick={()=>{setCat('autre');setTags([])}} className="card" style={{padding:18,cursor:'pointer',borderColor:cat==='autre'?'#a78bfa':'var(--border)'}}>
              <div style={{marginBottom:10}}><LayoutGrid size={22} color={cat==='autre'?'#a78bfa':'var(--tx2)'} strokeWidth={1.75}/></div>
              <div style={{fontSize:14,fontWeight:700,color:cat==='autre'?'#a78bfa':'var(--tx)',marginBottom:4}}>{t('home.otherService')}</div>
              <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300,lineHeight:1.5}}>{t('home.otherServiceSub')}</div>
            </div>
          </div>
          {cat==='autre'&&(<div style={{maxWidth:540,margin:'16px auto 0',animation:'fadeUp 0.3s ease'}}><OtherCategorySearch onSearch={kw=>{const t=kw.trim().split(/\s+/).filter(Boolean);setTags(t);if(t.length>0)setTimeout(()=>document.getElementById('artisans')?.scrollIntoView({behavior:'smooth'}),200)}}/>{tags.length===0&&<p style={{textAlign:'center',fontSize:12,color:'var(--tx3)',fontWeight:300,marginTop:12}}>{t('home.otherHint')}</p>}</div>)}
        </section>

        {/* ── ARTISANS ── */}
        <section id="artisans" style={{maxWidth:1100,margin:'0 auto',padding:'20px 24px 56px'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div><div className="section-label">{t('home.artisansTag')}</div><h2 style={{fontSize:20,fontWeight:800,letterSpacing:'-0.01em'}}>{loading?t('home.searching'):artisans.length===0&&cat==='autre'&&tags.length===0?t('home.addKeywords'):`${artisans.length} ${cat&&cat!=='autre'?cl(cat)+' — ':''}${artisans.length>1?t('home.artisansNear'):t('home.artisanNear')}`}</h2></div>
            <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
              {(['distance','rating','price_asc','price_desc','missions'] as const).map(s=>(
                <button key={s} onClick={()=>setSort(s)} className={`chip${sort===s?' chip-active':''}`} style={{padding:'6px 14px',fontSize:11}}>
                  {({distance:t('home.sortDistance'),rating:t('home.sortRating'),price_asc:t('home.sortPriceAsc'),price_desc:t('home.sortPriceDesc'),missions:t('home.sortExp')} as any)[s]}
                </button>
              ))}
              <div style={{width:1,height:14,background:'var(--border)',margin:'0 6px'}}/>
              <a href="/map" className="chip" style={{textDecoration:'none',fontSize:11}}>{t('nav.map')}</a>
            </div>
          </div>

          {loading?(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
              {[1,2,3,4,5,6].map(i=><div key={i} style={{height:210,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,animation:'pulse 1.5s infinite'}}/>)}
            </div>
          ):artisans.length===0?(
            <div style={{textAlign:'center',padding:'64px 0'}}>
              {cat==='autre'&&tags.length>0?(<><div style={{fontSize:15,fontWeight:700,color:'var(--tx2)',marginBottom:8}}>{t('home.noKeywordResults')}</div><button onClick={()=>{setCat('');setTags([])}} className="btn-primary" style={{marginTop:16}}>{t('home.seeAll')}</button></>):cat==='autre'&&tags.length===0?null:(<><div style={{fontSize:15,fontWeight:700,color:'var(--tx2)',marginBottom:8}}>{t('home.noArtisan')}</div><button onClick={()=>setCat('')} className="btn-primary" style={{marginTop:16}}>{t('home.seeAll')}</button></>)}
            </div>
          ):(
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
                {vis.map((a,i)=>{const c=cc(a.category);const init=a.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'A';const rt=Math.floor(Math.random()*20+5)
                  return(
                    <div key={a.artisan_id} onClick={()=>openA(a)} className="acard"
                      style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,cursor:'pointer',overflow:'hidden',opacity:a.is_available?1:0.4,position:'relative',animation:`fadeUp 0.5s ease ${i*0.06}s both`}}>
                      
                      {/* Banner gradient + centered avatar */}
                      <div style={{position:'relative',height:130,background:`linear-gradient(160deg, ${c}28, var(--bg2) 65%)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 30% 40%, ${c}12, transparent 60%)`}}/>
                        {a.avatar_url ? (
                          <img src={a.avatar_url} alt="" style={{width:72,height:72,borderRadius:18,objectFit:'cover',border:'3px solid var(--bg2)',boxShadow:`0 8px 28px ${c}20`,zIndex:1}}/>
                        ) : (
                          <div style={{width:72,height:72,borderRadius:18,background:`linear-gradient(135deg, ${c}35, ${c}18)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:800,color:c,border:'3px solid var(--bg2)',boxShadow:`0 8px 28px ${c}20`,zIndex:1}}>{init}</div>
                        )}
                        {/* Top badges */}
                        <div style={{position:'absolute',top:12,right:14,display:'flex',alignItems:'center',gap:5,padding:'4px 12px',borderRadius:20,background:'var(--bg2)',border:'1px solid var(--border)',backdropFilter:'blur(8px)',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                          {a.is_available ? <>
                            <div style={{width:6,height:6,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b981'}}/>
                            <span style={{fontSize:11,color:'#10b981',fontWeight:600}}>{t('common.online')}</span>
                          </> : <span style={{fontSize:11,color:'#ef4444',fontWeight:600}}>{t('common.offline')}</span>}
                        </div>
                        <div style={{position:'absolute',top:12,left:14,padding:'4px 12px',borderRadius:20,background:'var(--bg2)',border:`1px solid ${c}33`,backdropFilter:'blur(8px)',fontSize:11,color:c,fontWeight:700,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>{cl(a.category)}</div>
                      </div>

                      {/* Content */}
                      <div style={{padding:'16px 20px 20px',textAlign:'center'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:6}}>
                          <span style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{a.full_name}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        </div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:14}}>
                          <Stars r={a.rating_avg} s={13}/><span style={{fontSize:14,fontWeight:800,color:'#f59e0b'}}>{a.rating_avg?.toFixed(1)}</span><span style={{fontSize:12,color:'var(--tx3)'}}>({a.rating_count} {t('common.reviews')})</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'center',gap:14,marginBottom:18,fontSize:12,color:'var(--tx2)'}}>
                          <span>{a.distance_km!=null?`${a.distance_km.toFixed(1)} ${t('common.km')}`:'—'}</span><span style={{color:'var(--border)'}}>·</span>
                          <span>{a.total_missions} {t('common.missions')}</span><span style={{color:'var(--border)'}}>·</span>
                          <span style={{color:'#3b82f6'}}>~{rt} min</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:16,borderTop:'1px solid var(--border)'}}>
                          <div style={{textAlign:'left'}}>
                            <div style={{fontSize:10,color:'var(--tx3)',marginBottom:2}}>{t('home.fromPrice')}</div>
                            <div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{(a.hourly_rate||0).toLocaleString('fr-DZ')} <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)'}}>{t('common.da')}</span></div>
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

        {/* ── STATS ── */}
        <div ref={sr} style={{background:'var(--bg3)',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'56px 40px'}}>
          <div className="stats-grid" style={{maxWidth:860,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
            {[{v:cnt.a.toLocaleString('fr-FR'),x:'+',l:t('home.statsA')},{v:cnt.b,x:'%',l:t('home.statsB')},{v:cnt.c,p:'<',x:'min',l:t('home.statsC')},{v:cnt.d,x:'+',l:t('home.statsD')}].map((s:any,i)=>(
              <div key={i} style={{textAlign:'center',padding:16,borderRight:i<3?'1px solid var(--border)':'none'}}>
                <div style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',fontWeight:800,lineHeight:1,marginBottom:8,display:'flex',alignItems:'baseline',justifyContent:'center',gap:2}}>
                  {s.p&&<span style={{fontSize:'0.5em',fontWeight:300,color:'var(--accent)'}}>{s.p}</span>}
                  <span style={{background:'var(--gradient-text)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{s.v}</span>
                  <span style={{fontSize:'0.4em',fontWeight:300,color:'var(--tx3)'}}>{s.x}</span>
                </div>
                <div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMMENT ÇA MARCHE ── */}
        <section id="comment" style={{padding:'72px 24px',maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}><div className="section-label">{t('home.howTag')}</div><h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.howTitle')}</h2></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
            {[{n:'01',k:'step1',c:'#3b82f6'},{n:'02',k:'step2',c:'#6366f1'},{n:'03',k:'step3',c:'#10b981'}].map(s=>(
              <div key={s.n} className="card" style={{padding:'28px 24px'}}>
                <div style={{fontSize:48,fontWeight:800,background:`${s.c}15`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1,marginBottom:16}}>{s.n}</div>
                <div style={{width:20,height:3,background:s.c,marginBottom:14,borderRadius:2}}/>
                <div style={{fontSize:16,fontWeight:800,marginBottom:8}}>{t(`home.${s.k}t`)}</div>
                <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7,fontWeight:300}}>{t(`home.${s.k}d`)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── POURQUOI BETI ── */}
        <section style={{padding:'64px 24px',background:'var(--bg3)',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:40}}>
              <div className="section-label">{t('home.whyTag')}</div>
              <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.whyTitle')}</h2>
              <p style={{fontSize:14,color:'var(--tx2)',fontWeight:300,maxWidth:460,margin:'12px auto 0',lineHeight:1.7}}>{t('home.whySub')}</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
              {[{k:'why1',c:'#6366f1'},{k:'why2',c:'#10b981'},{k:'why3',c:'#3b82f6'},{k:'why4',c:'#f59e0b'},{k:'why5',c:'#8b5cf6'},{k:'why6',c:'#ef4444'}].map(f=>(
                <div key={f.k} className="card" style={{padding:22}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:f.c,marginBottom:14,boxShadow:`0 0 12px ${f.c}33`}}/>
                  <div style={{fontSize:14,fontWeight:800,marginBottom:6}}>{t(`home.${f.k}t`)}</div>
                  <div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.7,fontWeight:300}}>{t(`home.${f.k}d`)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TÉMOIGNAGES ── */}
        <section style={{padding:'72px 24px',maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:40}}><div className="section-label">{t('home.testiTag')}</div><h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em'}}>{t('home.testiTitle')}</h2></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
            {TESTI.map((x,i)=>(
              <div key={i} className="card" style={{padding:24}}>
                <Stars r={x.r} s={14}/>
                <p style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7,fontWeight:300,margin:'14px 0 20px',fontStyle:'italic'}}>"{t(`home.${x.k}`)}"</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div><div style={{fontSize:13,fontWeight:800}}>{x.name}</div><div style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{x.city}</div></div>
                  <span className="tag">{cl(x.s)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ARTISAN ── */}
        <section style={{padding:'0 24px 80px',maxWidth:1100,margin:'0 auto'}}>
          <div className="card" style={{padding:'56px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:40,flexWrap:'wrap',position:'relative',overflow:'hidden',border:'1px solid var(--accent)22'}}>
            <div style={{position:'absolute',right:-30,top:'50%',transform:'translateY(-50%)',fontSize:200,fontWeight:800,color:'var(--accent)',opacity:0.03,pointerEvents:'none'}}>BETI</div>
            <div style={{position:'relative',maxWidth:480}}>
              <div className="section-label">{t('home.ctaTag')}</div>
              <h2 style={{fontSize:30,fontWeight:800,marginBottom:14,lineHeight:1.2,letterSpacing:'-0.02em'}}>{t('home.ctaTitle')}</h2>
              <p style={{fontSize:14,color:'var(--tx2)',lineHeight:1.7,fontWeight:300,marginBottom:24}}>{t('home.ctaSub')}</p>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                {['ctaB1','ctaB2','ctaB3','ctaB4'].map(b=>(<div key={b} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--tx2)',fontWeight:300}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>{t(`home.${b}`)}</div>))}
              </div>
            </div>
            <a href="/auth/signup"><button className="btn-primary" style={{padding:'16px 40px',fontSize:15}}>{t('home.ctaBtn')}</button></a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="desktop-only" style={{background:'var(--bg3)',borderTop:'1px solid var(--border)',padding:'48px 40px 28px'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:32,marginBottom:40}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <div style={{width:26,height:26,background:'var(--gradient)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff'}}>B</div>
                  <span style={{fontSize:14,fontWeight:800,letterSpacing:'0.12em'}}>BETI</span>
                </div>
                <p style={{fontSize:12,color:'var(--tx3)',fontWeight:300,lineHeight:1.7}}>{t('home.footerDesc')}</p>
              </div>
              <div><div style={{fontSize:10,color:'var(--tx2)',fontWeight:700,letterSpacing:'0.08em',marginBottom:14}}>{t('home.footerServices')}</div>{['plomberie','electricite','serrurerie','menage','peinture','demenagement'].map(s=><a key={s} href="/#services" style={{display:'block',fontSize:12,color:'var(--tx3)',textDecoration:'none',fontWeight:300,marginBottom:8}}>{cl(s)}</a>)}</div>
              <div><div style={{fontSize:10,color:'var(--tx2)',fontWeight:700,letterSpacing:'0.08em',marginBottom:14}}>{t('home.footerPlatform')}</div>{[{l:t('home.footerHow'),h:'/#comment'},{l:t('nav.map'),h:'/map'},{l:t('home.footerBecome'),h:'/auth/signup'},{l:t('nav.login'),h:'/auth/login'}].map(s=><a key={s.l} href={s.h} style={{display:'block',fontSize:12,color:'var(--tx3)',textDecoration:'none',fontWeight:300,marginBottom:8}}>{s.l}</a>)}</div>
              <div><div style={{fontSize:10,color:'var(--tx2)',fontWeight:700,letterSpacing:'0.08em',marginBottom:14}}>{t('home.footerSupport')}</div>{[{l:t('nav.help'),h:'/aide'},{l:t('nav.settings'),h:'/parametres'},{l:t('home.footerLegal'),h:'#'},{l:t('home.footerCgu'),h:'#'}].map(s=><a key={s.l} href={s.h} style={{display:'block',fontSize:12,color:'var(--tx3)',textDecoration:'none',fontWeight:300,marginBottom:8}}>{s.l}</a>)}</div>
            </div>
            <div style={{height:1,background:'var(--border)',marginBottom:20}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
              <span style={{fontSize:11,color:'var(--tx3)',fontWeight:300}}>{t('home.footerCopy')}</span>
              <button onClick={toggleTheme} style={{fontSize:11,color:'var(--tx3)',background:'transparent',border:'none',cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>{dark?t('home.themeLight'):t('home.themeDark')}</button>
            </div>
          </div>
        </footer>

        </div>{/* /desktop-only */}
      </div>

      {/* ── PANEL ── */}
      {sel&&(<div style={{position:'fixed',inset:0,zIndex:300,display:'flex'}}>
        <div onClick={()=>setSel(null)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}}/>
        <div className="detail-sheet" style={{position:'absolute',right:0,top:0,bottom:0,width:'100%',maxWidth:440,background:'var(--bg)',borderLeft:'1px solid var(--border)',overflowY:'auto',animation:'slideIn 0.35s cubic-bezier(0.4,0,0.2,1)'}}>
          <div style={{padding:24,borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:14}}>
            {sel.avatar_url?<img src={sel.avatar_url} alt="" style={{width:52,height:52,borderRadius:'50%',objectFit:'cover',border:`2px solid ${cc(sel.category)}33`}}/>:<div style={{width:52,height:52,borderRadius:'50%',background:`${cc(sel.category)}12`,border:`2px solid ${cc(sel.category)}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:cc(sel.category)}}>{sel.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>}
            <div style={{flex:1}}><div style={{fontSize:17,fontWeight:800}}>{sel.full_name}</div><div style={{fontSize:11,color:cc(sel.category),fontWeight:700,marginBottom:3}}>{cl(sel.category)}</div><div style={{display:'flex',alignItems:'center',gap:5}}><Stars r={sel.rating_avg} s={12}/><span style={{fontSize:12,fontWeight:800,color:'#f59e0b'}}>{sel.rating_avg?.toFixed(1)}</span><span style={{fontSize:10,color:'var(--tx3)'}}>({sel.rating_count})</span></div></div>
            <button onClick={()=>setSel(null)} style={{background:'transparent',border:'none',color:'var(--tx3)',fontSize:18,cursor:'pointer'}}>✕</button>
          </div>
          <div style={{padding:'14px 24px',display:'flex',gap:10,borderBottom:'1px solid var(--border)'}}>
            {[{v:`${(sel.hourly_rate||0).toLocaleString('fr-DZ')} ${t('common.da')}`,l:t('booking.rate')},{v:sel.distance_km!=null?`${sel.distance_km.toFixed(1)} ${t('common.km')}`:'—',l:t('home.sortDistance')},{v:sel.total_missions.toString(),l:t('profile.missions')}].map(s=>(
              <div key={s.l} style={{flex:1,textAlign:'center',padding:12,background:'var(--bg2)',borderRadius:10,border:'1px solid var(--border)'}}><div style={{fontSize:15,fontWeight:800}}>{s.v}</div><div style={{fontSize:10,color:'var(--tx3)',fontWeight:300}}>{s.l}</div></div>
            ))}
          </div>
          <div style={{padding:'14px 24px',display:'flex',flexDirection:'column',gap:10,borderBottom:'1px solid var(--border)'}}>
            {contactErr&&<div style={{padding:'10px 14px',borderRadius:8,background:'#ef444412',border:'1px solid #ef444422',fontSize:12,color:'#ef4444'}}>{contactErr}</div>}
            {sent?<div style={{padding:14,borderRadius:12,background:'#10b98112',border:'1px solid #10b98122',textAlign:'center'}}><span style={{fontSize:13,color:'#10b981',fontWeight:700}}>{t('home.panelSent')}</span></div>:(
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>contact('message')} className="btn-primary" style={{flex:1,padding:14}}>{t('home.sendMessage')}</button>
              <button onClick={()=>contact('call')} className="btn-ghost" style={{padding:'14px 20px',borderColor:'#10b98144',color:'#10b981'}}>{t('home.call')}</button>
            </div>)}
          </div>
          <div style={{padding:'16px 24px'}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:14}}>{t('profile.reviews')} ({revs.length})</div>
            {loadR?<div style={{textAlign:'center',padding:24,color:'var(--tx3)',fontSize:12}}>{t('common.loading')}</div>:revs.length===0?<div style={{textAlign:'center',padding:24,color:'var(--tx3)',fontSize:12,fontWeight:300}}>{t('home.noReviews')}</div>:
              <div style={{display:'flex',flexDirection:'column',gap:8}}>{revs.map(r=>(
                <div key={r.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:22,height:22,borderRadius:'50%',background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800}}>{(r.profiles?.full_name||'C')[0]}</div><div><div style={{fontSize:11,fontWeight:800}}>{r.profiles?.full_name||'Client'}</div><div style={{fontSize:9,color:'var(--tx3)',fontWeight:300}}>{ta(r.created_at)}</div></div></div>
                    <Stars r={r.rating} s={9}/>
                  </div>
                  {r.comment&&<p style={{fontSize:11,color:'var(--tx2)',lineHeight:1.6,fontWeight:300}}>{r.comment}</p>}
                </div>
              ))}</div>}
          </div>
          <div style={{padding:'14px 24px 32px'}}><button onClick={()=>router.push(`/artisan/${sel.artisan_id}`)} className="btn-ghost" style={{width:'100%'}}>{t('home.fullProfile')}</button></div>
        </div>
      </div>)}
    </>
  )
}
