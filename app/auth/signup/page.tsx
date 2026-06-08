'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/LangContext'

const CC = [
  {c:'+213',f:'🇩🇿',n:'Algérie'},{c:'+33',f:'🇫🇷',n:'France'},{c:'+212',f:'🇲🇦',n:'Maroc'},
  {c:'+216',f:'🇹🇳',n:'Tunisie'},{c:'+218',f:'🇱🇾',n:'Libye'},{c:'+20',f:'🇪🇬',n:'Égypte'},
  {c:'+966',f:'🇸🇦',n:'Arabie Saoudite'},{c:'+971',f:'🇦🇪',n:'EAU'},{c:'+974',f:'🇶🇦',n:'Qatar'},
  {c:'+90',f:'🇹🇷',n:'Turquie'},{c:'+49',f:'🇩🇪',n:'Allemagne'},{c:'+44',f:'🇬🇧',n:'UK'},
  {c:'+1',f:'🇺🇸',n:'USA'},{c:'+39',f:'🇮🇹',n:'Italie'},{c:'+34',f:'🇪🇸',n:'Espagne'},
  {c:'+32',f:'🇧🇪',n:'Belgique'},{c:'+41',f:'🇨🇭',n:'Suisse'},{c:'+1',f:'🇨🇦',n:'Canada'},
]

export default function SignupPage() {
  const router = useRouter()
  const { t, isAr } = useLang()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<'client'|'artisan'|null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [phone, setPhone] = useState('')
  const [cc, setCc] = useState('+213')
  const [showCc, setShowCc] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const [ok, setOk] = useState(false)
  const [okMsg, setOkMsg] = useState('Compte créé !')

  const fullPhone = `${cc}${phone.replace(/[\s\-()]/g,'')}`
  const sel = CC.find(x=>x.c===cc)||CC[0]
  const pws = (()=>{let s=0;if(pw.length>=6)s++;if(pw.length>=10)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s})()
  const canGo = name && email && pw.length>=6 && phone.length>=6 && !phoneErr

  const checkPhone = async()=>{
    if(phone.length<6)return;setPhoneErr('')
    const{data}=await supabase.from('profiles').select('id').eq('phone',fullPhone).limit(1)
    if(data&&data.length>0)setPhoneErr('Ce numéro est déjà utilisé')
  }

  const submit = async()=>{
    if(!role||phoneErr)return;setLoading(true);setErr('')
    // Rate limit
    try{const k='beti_sr';const s=JSON.parse(localStorage.getItem(k)||'{"c":0,"t":0}');if(Date.now()-s.t>9e5){s.c=0;s.t=Date.now()};if(s.c>=5){setErr('Trop de tentatives');setLoading(false);return};s.c++;localStorage.setItem(k,JSON.stringify(s))}catch{}
    // Phone check
    const{data:pc}=await supabase.from('profiles').select('id').eq('phone',fullPhone).limit(1)
    if(pc&&pc.length>0){setErr('Ce numéro est déjà utilisé');setLoading(false);return}
    // Signup
    const{data:sd,error:se}=await supabase.auth.signUp({email,password:pw,options:{data:{full_name:name,role,phone:fullPhone}}})
    if(se){
      setErr(se.message.includes('already registered')?'Cet email est déjà utilisé':se.message.includes('valid email')?'Email invalide':se.message.includes('6 char')?'Mot de passe trop court':se.message)
      setLoading(false);return
    }
    const uid=sd.user?.id;if(!uid){setErr('Erreur de création');setLoading(false);return}

    // Si pas de session = email confirmation activée dans Supabase
    if(!sd.session){
      setOk(true);setOkMsg('Vérifiez votre boîte email pour confirmer votre compte');setLoading(false);return
    }

    // Session OK → créer le profil
    try{
      await supabase.from('profiles').upsert({id:uid,full_name:name,phone:fullPhone,role},{onConflict:'id'})
      if(role==='artisan')await supabase.from('artisans').upsert({id:uid,category:'plomberie',hourly_rate:0,is_available:false,rating_avg:0,rating_count:0,total_missions:0},{onConflict:'id'})
    }catch(e:any){console.error('Profile creation error:',e)}

    setOk(true);setOkMsg('Compte créé !');setTimeout(()=>router.push(role==='artisan'?'/artisan-dashboard/profil':'/mon-espace'),2000);setLoading(false)
  }

  const inp = {width:'100%',padding:'13px 16px',background:'var(--bg3,#0e0e18)',border:'1px solid var(--border,#1c1c30)',borderRadius:10,color:'var(--tx,#e0dfe5)',fontSize:14,outline:'none' as const,fontFamily:'Nexa,sans-serif',fontWeight:300 as const}
  const btn = (active:boolean)=>({width:'100%',padding:14,border:'none' as const,borderRadius:10,fontSize:14,fontWeight:700 as const,cursor:active?'pointer':'not-allowed' as const,fontFamily:'Nexa,sans-serif',background:active?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--border,#1c1c30)',color:active?'#fff':'var(--tx3,#4a4a65)',transition:'all 0.2s'})

  if(ok)return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'#10b98115',border:'2px solid #10b98133',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <div style={{fontSize:24,fontWeight:800,color:'var(--tx)'}}>{okMsg}</div>
        <div style={{fontSize:13,color:'var(--tx2)',marginTop:8}}>{okMsg.includes('email')?'Puis connectez-vous':'Redirection...'}</div>
      </div>
    </div>
  )

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:440}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <a href="/" style={{textDecoration:'none',display:'inline-flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff'}}>B</div>
            <span style={{fontSize:20,fontWeight:800,color:'var(--tx)',letterSpacing:'0.08em'}}>BETI</span>
          </a>
        </div>
        {/* Steps */}
        <div style={{display:'flex',gap:6,marginBottom:28,justifyContent:'center'}}>
          {[1,2,3].map(i=><div key={i} style={{height:3,width:48,borderRadius:2,background:i<=step?'#6366f1':'var(--border)',transition:'all 0.3s'}}/>)}
        </div>

        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:18,padding:'36px 32px',boxShadow:'var(--card-shadow)'}}>

          {step===1&&<>
            <h1 style={{fontSize:26,fontWeight:800,color:'var(--tx)',marginBottom:8}}>Bienvenue sur BETI</h1>
            <p style={{fontSize:13,color:'var(--tx2)',marginBottom:28}}>Vous êtes...</p>
            {[{v:'client',t:'Client',d:'Je cherche un artisan'},{v:'artisan',t:'Artisan / Prestataire',d:'Je propose mes services'}].map(o=>
              <div key={o.v} onClick={()=>setRole(o.v as any)} style={{padding:'16px 18px',borderRadius:12,cursor:'pointer',border:`1px solid ${role===o.v?'#6366f1':'var(--border)'}`,background:role===o.v?'#6366f10d':'var(--bg3)',marginBottom:10,transition:'all 0.2s'}}>
                <div style={{fontSize:15,fontWeight:700,color:'var(--tx)',marginBottom:2}}>{o.t}</div>
                <div style={{fontSize:12,color:'var(--tx2)',fontWeight:300}}>{o.d}</div>
              </div>
            )}
            <button onClick={()=>role&&setStep(2)} style={btn(!!role)}>Continuer</button>
            <p style={{textAlign:'center',fontSize:13,color:'var(--tx2)',marginTop:20}}>Déjà un compte ? <a href="/auth/login" style={{color:'#6366f1',textDecoration:'none',fontWeight:700}}>Se connecter</a></p>
          </>}

          {step===2&&<>
            <h1 style={{fontSize:26,fontWeight:800,color:'var(--tx)',marginBottom:8}}>Vos informations</h1>
            <p style={{fontSize:13,color:'var(--tx2)',marginBottom:24}}>Créez votre compte BETI</p>

            {[{l:'NOM COMPLET',t:'text',p:'Karim Benali',v:name,s:setName},{l:'EMAIL',t:'email',p:'votre@email.com',v:email,s:setEmail},{l:'MOT DE PASSE',t:'password',p:'Min. 6 caractères',v:pw,s:setPw}].map(f=>
              <div key={f.l} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:'var(--tx2)',display:'block',marginBottom:6,fontWeight:700,letterSpacing:'0.06em'}}>{f.l}</label>
                <input type={f.t} placeholder={f.p} value={f.v} onChange={e=>f.s(e.target.value)} style={inp}/>
              </div>
            )}

            {pw.length>0&&<div style={{marginBottom:14}}>
              <div style={{display:'flex',gap:4,marginBottom:4}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=pws?(pws<=2?'#ef4444':pws<=3?'#f59e0b':'#10b981'):'var(--border)',transition:'all 0.3s'}}/>)}</div>
              <span style={{fontSize:10,color:pws<=2?'#ef4444':pws<=3?'#f59e0b':'#10b981'}}>{pws<=2?'Faible':pws<=3?'Moyen':'Fort'}</span>
            </div>}

            {/* Phone */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:'var(--tx2)',display:'block',marginBottom:6,fontWeight:700,letterSpacing:'0.06em'}}>TÉLÉPHONE <span style={{color:'#ef4444'}}>*</span></label>
              <div style={{display:'flex',position:'relative'}}>
                <button onClick={()=>setShowCc(!showCc)} type="button" style={{display:'flex',alignItems:'center',gap:6,padding:'13px 12px',background:'var(--bg3)',border:'1px solid var(--border)',borderRight:'none',borderRadius:'10px 0 0 10px',cursor:'pointer',fontSize:14,color:'var(--tx)',fontFamily:'Nexa,sans-serif',flexShrink:0,minWidth:100}}>
                  <span style={{fontSize:18}}>{sel.f}</span><span style={{fontSize:13,color:'var(--tx2)'}}>{cc}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{transform:showCc?'rotate(180deg)':'none',transition:'transform 0.2s'}}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {showCc&&<div style={{position:'absolute',top:'100%',left:0,zIndex:50,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'var(--card-shadow)',maxHeight:220,overflowY:'auto',width:260,marginTop:4}}>
                  {CC.map(c=><div key={c.c+c.n} onClick={()=>{setCc(c.c);setShowCc(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'0.5px solid var(--border)'}} onMouseEnter={e=>(e.currentTarget.style.background='var(--bg3)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <span style={{fontSize:18}}>{c.f}</span><span style={{fontSize:13,color:'var(--tx)',flex:1}}>{c.n}</span><span style={{fontSize:12,color:'var(--tx3)'}}>{c.c}</span>
                  </div>)}
                </div>}
                <input type="tel" placeholder="555 12 34 56" value={phone} onChange={e=>{setPhone(e.target.value);setPhoneErr('')}} onBlur={checkPhone} style={{...inp,borderRadius:'0 10px 10px 0',borderColor:phoneErr?'#ef4444':'var(--border,#1c1c30)'}}/>
              </div>
              {phoneErr&&<p style={{fontSize:11,color:'#ef4444',marginTop:6}}>{phoneErr}</p>}
              <p style={{fontSize:10,color:'var(--tx3)',marginTop:6}}>Un seul compte par numéro</p>
            </div>

            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setStep(1)} style={{flex:1,padding:14,borderRadius:10,background:'transparent',border:'1px solid var(--border)',color:'var(--tx2)',fontSize:13,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>Retour</button>
              <button onClick={()=>canGo&&setStep(3)} style={{...btn(canGo),flex:2}}>Continuer</button>
            </div>
          </>}

          {step===3&&<>
            <h1 style={{fontSize:26,fontWeight:800,color:'var(--tx)',marginBottom:8}}>Confirmation</h1>
            <p style={{fontSize:13,color:'var(--tx2)',marginBottom:24}}>Vérifiez vos informations</p>
            <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,padding:18,marginBottom:24}}>
              {[{l:'Rôle',v:role==='client'?'Client':'Artisan'},{l:'Nom',v:name},{l:'Email',v:email},{l:'Téléphone',v:`${cc} ${phone}`}].map(i=>
                <div key={i.l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'0.5px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--tx3)'}}>{i.l}</span><span style={{fontSize:13,color:'var(--tx)',fontWeight:700}}>{i.v}</span>
                </div>
              )}
            </div>
            {err&&<div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,background:'#ef444412',border:'1px solid #ef444422',fontSize:13,color:'#ef4444'}}>{err}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep(2)} style={{flex:1,padding:14,borderRadius:10,background:'transparent',border:'1px solid var(--border)',color:'var(--tx2)',fontSize:13,cursor:'pointer',fontFamily:'Nexa,sans-serif'}}>Retour</button>
              <button onClick={submit} disabled={loading} style={{...btn(!loading),flex:2,cursor:loading?'wait':'pointer'}}>{loading?'Création...':'Créer mon compte'}</button>
            </div>
          </>}
        </div>
      </div>
      {showCc&&<div style={{position:'fixed',inset:0,zIndex:40}} onClick={()=>setShowCc(false)}/>}
    </div>
  )
}
