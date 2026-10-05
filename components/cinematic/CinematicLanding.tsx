'use client'

// components/cinematic/CinematicLanding.tsx
// Expérience cinématique de première visite (desktop uniquement) : l'appartement
// 3D occupe tout l'écran, le scroll pilote la caméra (Lenis + GSAP ScrollTrigger),
// chaque section met une pièce/un métier en avant avec une carte de verre.
// Monde visuel volontairement CLAIR (blanc + bleu d'Alger), indépendant du thème du
// site — aucune variable --bg/--tx ici pour ne pas hériter du thème sombre.
//
// NOTE framer-motion : volontairement absent — GSAP couvre tout et framer-motion
// a déjà cassé des pages fixed du site par le passé.

import { useEffect, useRef, useState, Component, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useProgress } from '@react-three/drei'
import { useLang } from '@/lib/LangContext'
import { LogoMark } from '@/components/Logo'
import { Droplets, Hammer, Zap, Paintbrush, Wind, ChevronDown, X, Search } from 'lucide-react'
import { SECTIONS, HERO, FINAL, ARC_HEIGHT, initialCamState, type CamState } from '@/lib/cinematic'
import Scene from './Scene'

const DONE_KEY = 'beti-cine-done'
const ICONS: Record<string, typeof Droplets> = {
  plomberie: Droplets, menuiserie: Hammer, electricite: Zap, peinture: Paintbrush, climatisation: Wind,
}
const INK = '#111118'          // texte noir du monde clair
const INK2 = 'rgba(17,17,24,0.62)'

/* Si le WebGL plante (drivers, GPU blacklisté…), on referme proprement
   l'expérience au lieu d'afficher un écran cassé. */
class CineErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function Loader({ done }: { done: boolean }) {
  const { t } = useLang()
  const { progress } = useProgress()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (done && ref.current) gsap.to(ref.current, { autoAlpha: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 })
  }, [done])
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: 'radial-gradient(120% 90% at 50% 0%, #EFEAFF 0%, #FFFFFF 60%)' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0F3F86,#175CC4)', boxShadow: '0 18px 50px rgba(23,92,196,0.35)', animation: 'cineFloat 2.6s ease-in-out infinite' }}>
        <LogoMark size={32} variant="white" />
      </div>
      <div style={{ width: 180, height: 3, borderRadius: 2, background: 'rgba(23,92,196,0.12)', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#0F3F86,#175CC4)', transition: 'width 0.25s ease' }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: INK2, letterSpacing: '0.06em' }}>
        {t('cine.loading')} {Math.round(progress)}%
      </div>
    </div>
  )
}

/* Mockup téléphone premium (CSS pur) pour la section finale. */
function PhoneMockup() {
  const { t } = useLang()
  return (
    <div style={{ width: 218, height: 440, borderRadius: 40, padding: 10, background: 'linear-gradient(160deg,#1a1526,#0b0b12)', boxShadow: '0 40px 90px -20px rgba(23,92,196,0.45), inset 0 1px 1px rgba(255,255,255,0.18)', flexShrink: 0 }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 31, overflow: 'hidden', position: 'relative', background: 'radial-gradient(130% 80% at 50% 0%, #2a1d63 0%, #0b0b12 62%)' }}>
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 74, height: 20, borderRadius: 12, background: '#000' }} />
        <div style={{ padding: '52px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#0F3F86,#175CC4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogoMark size={14} variant="white" /></div>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>BETI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 14 }}>
            <Search size={12} color="rgba(255,255,255,0.55)" />
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)' }}>{t('mhome.searchPh')}</span>
          </div>
          {[0.9, 0.7, 0.5].map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, background: `rgba(255,255,255,${0.07 * o + 0.03})`, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 9, opacity: o }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg,rgba(124,92,255,0.5),rgba(23,92,196,0.25))' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '72%', height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.3)', marginBottom: 6 }} />
                <div style={{ width: '46%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.16)' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, borderRadius: 13, textAlign: 'center', background: 'linear-gradient(135deg,#0F3F86,#175CC4)', color: '#fff', fontSize: 10.5, fontWeight: 800 }}>{t('cine.ctaFind')}</div>
        </div>
      </div>
    </div>
  )
}

export default function CinematicLanding({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { t, isAr } = useLang()
  const { progress, active } = useProgress()
  const loaded = progress >= 100 && !active

  const rootRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const camRef = useRef<CamState>(initialCamState())
  // Debug : ?cineCam=x,y,z,tx,ty,tz fige la caméra à cette pose (repérage) ;
  // ?cineZone=N charge la section N complète (caméra + halo + mascotte) pour
  // régler les positions de lib/cinematic.ts capture par capture.
  if (typeof window !== 'undefined' && camRef.current.spin === 1) {
    const params = new URLSearchParams(window.location.search)
    const dbg = params.get('cineCam')
    if (dbg) {
      const [x, y, z, tx, ty, tz] = dbg.split(',').map(Number)
      if ([x, y, z, tx, ty, tz].every(n => Number.isFinite(n))) {
        Object.assign(camRef.current, { x, y, z, tx, ty, tz, spin: 0 })
      }
    }
    const zs = params.get('cineZone')
    const s = zs != null ? SECTIONS[parseInt(zs, 10)] : undefined
    if (s) {
      Object.assign(camRef.current, {
        x: s.cam[0], y: s.cam[1], z: s.cam[2],
        tx: s.look[0], ty: s.look[1], tz: s.look[2],
        hx: s.look[0], hz: s.look[2], hOp: 1, hColor: s.color,
        bx: s.bot[0], bz: s.bot[1], zone: SECTIONS.indexOf(s), spin: 0,
      })
    }
  }
  const mouseRef = useRef({ x: 0, y: 0 })
  const lenisRef = useRef<Lenis | null>(null)
  const [closing, setClosing] = useState(false)

  const finish = (dest?: string) => {
    if (closing) return
    setClosing(true)
    try { localStorage.setItem(DONE_KEY, '1') } catch {}
    gsap.to(rootRef.current, {
      autoAlpha: 0, duration: 0.6, ease: 'power2.inOut',
      onComplete: () => { onClose(); if (dest) router.push(dest) },
    })
  }
  const finishRef = useRef(finish); finishRef.current = finish

  /* ── Orchestration scroll : Lenis + ScrollTrigger + timelines caméra ── */
  useEffect(() => {
    if (!wrapRef.current || !contentRef.current) return
    gsap.registerPlugin(ScrollTrigger)
    const wrapper = wrapRef.current
    const cam = camRef.current

    const lenis = new Lenis({ wrapper, content: contentRef.current, duration: 1.3, smoothWheel: true })
    lenisRef.current = lenis
    lenis.stop() // bloqué tant que le modèle charge
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const st = (vars: ScrollTrigger.Vars): ScrollTrigger.Vars => ({ scroller: wrapper, ...vars })
    const sections = Array.from(contentRef.current.querySelectorAll<HTMLElement>('[data-cine-section]'))
    const waypoints = [...SECTIONS.map(s => ({ cam: s.cam, look: s.look })), { cam: FINAL.cam, look: FINAL.look }]

    // Caméra : un arc « hélicoptère » par section — montée au-dessus des murs
    // vers la pièce (le regard glisse déjà vers elle), puis descente dedans.
    // La cible s'aligne d'elle-même sur le DOM (trigger par section).
    sections.forEach((el, i) => {
      const w = waypoints[i]
      const isFinal = i === SECTIONS.length
      const prev = i === 0 ? { cam: HERO.cam } : waypoints[i - 1]
      const midX = (prev.cam[0] + w.cam[0]) / 2
      const midZ = (prev.cam[2] + w.cam[2]) / 2 + 1.5 // léger détour côté terrasse
      const tl = gsap.timeline({
        scrollTrigger: st({ trigger: el, start: 'top bottom', end: 'top top', scrub: 1.1 }),
      })
      if (isFinal) {
        // Sortie : la caméra s'élève et recule d'un seul geste, tout s'embrase.
        tl.to(cam, {
          x: w.cam[0], y: w.cam[1], z: w.cam[2],
          tx: w.look[0], ty: w.look[1], tz: w.look[2],
          tint: 1, hOp: 0, ease: 'power2.inOut',
        })
      } else {
        tl.to(cam, {
          x: midX, y: ARC_HEIGHT, z: midZ,
          tx: w.look[0], ty: w.look[1], tz: w.look[2],
          hx: w.look[0], hz: w.look[2],
          bx: SECTIONS[i].bot[0], bz: SECTIONS[i].bot[1],
          ...(i === 0 ? { spin: 0 } : {}),
          ease: 'power1.inOut', duration: 0.55,
        }).to(cam, {
          x: w.cam[0], y: w.cam[1], z: w.cam[2],
          ease: 'power2.out', duration: 0.45,
        })
        // Micro-travelling pendant la lecture de la carte (jamais statique).
        // Se termine pile quand l'arc de la section suivante démarre
        // ('bottom bottom') pour ne jamais se disputer cam.x avec lui.
        gsap.to(cam, {
          x: w.cam[0] + (i % 2 === 0 ? 0.7 : -0.7), y: w.cam[1] + 0.35,
          ease: 'none', immediateRender: false,
          scrollTrigger: st({ trigger: el, start: 'top top', end: 'bottom bottom', scrub: true }),
        })
      }
      // Halo : s'allume à l'arrivée sur la zone, s'éteint en la quittant.
      if (!isFinal) {
        gsap.fromTo(cam, { hOp: 0 }, {
          hOp: 1, ease: 'power1.inOut', immediateRender: false,
          onStart: () => { cam.hColor = SECTIONS[i].color; cam.zone = i },
          scrollTrigger: st({ trigger: el, start: 'top 45%', end: 'top 12%', scrub: true }),
        })
        gsap.to(cam, {
          hOp: 0, ease: 'power1.inOut', immediateRender: false,
          scrollTrigger: st({ trigger: el, start: 'bottom 55%', end: 'bottom 25%', scrub: true }),
        })
      }
      // Carte de verre : entrée en fondu + glissement, pilotée par le scroll.
      const card = el.querySelector('[data-cine-card]')
      if (card) {
        gsap.fromTo(card, { autoAlpha: 0, y: 70 }, {
          autoAlpha: 1, y: 0, ease: 'power2.out', immediateRender: false,
          scrollTrigger: st({ trigger: el, start: 'top 62%', end: 'top 22%', scrub: true }),
        })
      }
    })

    // Héros : contenu qui s'efface quand on commence à visiter.
    if (heroRef.current) {
      gsap.to(heroRef.current, {
        autoAlpha: 0, y: -60, ease: 'power1.in', immediateRender: false,
        scrollTrigger: st({ trigger: contentRef.current, start: 'top top', end: '9% top', scrub: true }),
      })
    }
    if (hintRef.current) {
      gsap.to(hintRef.current, {
        autoAlpha: 0, immediateRender: false,
        scrollTrigger: st({ trigger: contentRef.current, start: 'top top', end: '4% top', scrub: true }),
      })
    }

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finishRef.current() }
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousemove', onMouse)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMouse)
      document.body.style.overflow = ''
      ScrollTrigger.getAll().forEach(s => s.kill())
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  /* Entrée du héros une fois le modèle chargé + déblocage du scroll. */
  useEffect(() => {
    if (!loaded) return
    lenisRef.current?.start()
    if (heroRef.current) {
      gsap.fromTo(heroRef.current.children,
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.11, ease: 'power3.out', delay: 0.35 })
    }
  }, [loaded])

  const glassCard: React.CSSProperties = {
    maxWidth: 400, padding: '30px 32px', borderRadius: 24,
    background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.75)',
    backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    boxShadow: '0 24px 70px -18px rgba(23,92,196,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
  }
  const primaryBtn: React.CSSProperties = {
    padding: '16px 36px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg,#0F3F86,#175CC4)', color: '#fff', fontSize: 15, fontWeight: 700,
    boxShadow: '0 14px 34px -10px rgba(23,92,196,0.55)', transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease',
  }
  const ghostBtn: React.CSSProperties = {
    padding: '16px 32px', borderRadius: 16, cursor: 'pointer',
    background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(17,17,24,0.1)', color: INK,
    fontSize: 15, fontWeight: 700, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s ease',
  }

  return (
    <div ref={rootRef} dir={isAr ? 'rtl' : 'ltr'} style={{ position: 'fixed', inset: 0, zIndex: 95000, background: 'radial-gradient(130% 100% at 50% 0%, #EFEAFF 0%, #FFFFFF 52%, #F4F1FF 100%)', color: INK }}>
      <style>{`
        @keyframes cineFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes cineBounce { 0%,100% { transform: translateY(0); opacity: 0.9 } 50% { transform: translateY(7px); opacity: 0.4 } }
        .cine-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .cine-scroll::-webkit-scrollbar { display: none; }
        .cine-btn:hover { transform: translateY(-2px); }
        .cine-btn:active { transform: translateY(0) scale(0.98); }
      `}</style>

      {/* ── Scène 3D fixe derrière le contenu ── */}
      <CineErrorBoundary onError={() => finishRef.current()}>
        <Scene cam={camRef.current} mouse={mouseRef} />
      </CineErrorBoundary>

      <Loader done={loaded} />

      {/* ── Barre haute ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0F3F86,#175CC4)', boxShadow: '0 8px 22px rgba(23,92,196,0.3)' }}>
            <LogoMark size={18} variant="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.1em', color: INK }}>BETI</span>
        </div>
        <button onClick={() => finish()} className="cine-btn" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(17,17,24,0.08)', color: INK2, fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'transform 0.2s ease' }}>
          {t('cine.skip')} <X size={14} />
        </button>
      </div>

      {/* ── Indice de scroll ── */}
      <div ref={hintRef} style={{ position: 'absolute', bottom: 26, left: 0, right: 0, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK2 }}>{t('cine.scrollHint')}</span>
        <ChevronDown size={18} color={INK2} style={{ animation: 'cineBounce 1.8s ease-in-out infinite' }} />
      </div>

      {/* ── Conteneur de scroll ── */}
      <div ref={wrapRef} className="cine-scroll" style={{ position: 'absolute', inset: 0, zIndex: 20, overflowY: 'auto', overflowX: 'hidden' }}>
        <div ref={contentRef}>

          {/* HÉROS */}
          <section style={{ height: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '11vh' }}>
            <div ref={heroRef} style={{ textAlign: 'center', maxWidth: 780, padding: '0 32px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(23,92,196,0.16)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#175CC4', marginBottom: 26, opacity: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b98188' }} />
                {t('home.badge')}
              </div>
              <h1 style={{ fontSize: 'clamp(2.6rem, 5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.03em', margin: '0 0 20px', color: INK, opacity: 0 }}>
                {t('cine.heroTitle')}
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: INK2, maxWidth: 520, margin: '0 auto 34px', fontWeight: 400, opacity: 0 }}>
                {t('cine.heroSub')}
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: 0 }}>
                <button onClick={() => finish()} className="cine-btn" style={primaryBtn}>{t('cine.ctaFind')}</button>
                <button onClick={() => finish('/auth/signup')} className="cine-btn" style={ghostBtn}>{t('cine.ctaBecome')}</button>
              </div>
            </div>
          </section>

          {/* SECTIONS MÉTIERS */}
          {SECTIONS.map((s, i) => {
            const Icon = ICONS[s.id] || Droplets
            const side = i % 2 === 0
            return (
              <section key={s.id} data-cine-section style={{ height: '170vh', position: 'relative' }}>
                <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: side !== isAr ? 'flex-start' : 'flex-end', padding: '0 clamp(32px, 8vw, 130px)' }}>
                  <div data-cine-card style={{ ...glassCard, opacity: 0 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${s.color}, ${s.color}99)`, boxShadow: `0 12px 30px -8px ${s.color}88`, marginBottom: 20 }}>
                      <Icon size={24} color="#fff" strokeWidth={1.9} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: s.color, marginBottom: 8 }}>
                      {String(i + 1).padStart(2, '0')} / 05
                    </div>
                    <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px', color: INK }}>{t(s.titleKey)}</h2>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: INK2, margin: 0 }}>{t(s.descKey)}</p>
                  </div>
                </div>
              </section>
            )
          })}

          {/* FINAL */}
          <section data-cine-section style={{ height: '175vh', position: 'relative' }}>
            <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div data-cine-card style={{ display: 'flex', alignItems: 'center', gap: 'clamp(36px, 6vw, 90px)', padding: '46px 56px', borderRadius: 32, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 30px 90px -20px rgba(23,92,196,0.3)', opacity: 0 }}>
                <div style={{ maxWidth: 480, textAlign: isAr ? 'right' : 'left' }}>
                  <div style={{ width: 62, height: 62, borderRadius: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0F3F86,#175CC4)', boxShadow: '0 18px 50px rgba(23,92,196,0.4)', marginBottom: 26 }}>
                    <LogoMark size={30} variant="white" />
                  </div>
                  <h2 style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.025em', margin: '0 0 16px', color: INK }}>
                    {t('cine.finalTitle')}
                  </h2>
                  <p style={{ fontSize: 16, lineHeight: 1.7, color: INK2, margin: '0 0 30px' }}>{t('cine.heroSub')}</p>
                  <button onClick={() => finish()} className="cine-btn" style={{ ...primaryBtn, padding: '17px 44px' }}>{t('cine.finalCta')}</button>
                </div>
                <PhoneMockup />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
