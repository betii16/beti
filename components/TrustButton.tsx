'use client'
import { useState } from 'react'
import { Award, ShieldCheck, Star, BadgeCheck, X } from 'lucide-react'
import { useLang } from '@/lib/LangContext'

export default function TrustButton({
  label,
  size = 'md',
}: {
  label?: string
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const { t, isAr } = useLang()
  const sm = size === 'sm'
  const displayLabel = label ?? t('trust.label')

  return (
    <>
      <style>{`
        @keyframes beti-trust-rotate { to { transform: translate(-50%, -50%) rotate(1turn); } }
        @keyframes beti-trust-shine  { 0% { transform: translateX(-160%) skewX(-20deg); }
                                       55%, 100% { transform: translateX(320%) skewX(-20deg); } }
        @keyframes beti-trust-popup  { from { opacity:0; transform:translateY(10px) scale(.97); }
                                       to   { opacity:1; transform:translateY(0)    scale(1);   } }
        .beti-trust {
          position: relative; display: inline-flex; align-items: center; justify-content: center;
          padding: var(--ring); border: none; border-radius: 999px; background: transparent;
          isolation: isolate; overflow: hidden; font-family: 'Nexa', sans-serif; cursor: pointer;
          box-shadow: 0 8px 28px color-mix(in srgb,#5A3DF0 38%,transparent);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .beti-trust:hover { transform: translateY(-1px); box-shadow: 0 12px 34px color-mix(in srgb,#5A3DF0 48%,transparent); }
        .beti-trust:active { transform: translateY(0); }
        .beti-trust::before {
          content: ""; position: absolute; z-index: -2; top: 50%; left: 50%;
          width: 250%; aspect-ratio: 1; translate: -50% -50%;
          background: conic-gradient(from 0deg,transparent 0deg 70deg,color-mix(in srgb,#fff 85%,#5A3DF0) 92deg,#fff 100deg,transparent 130deg 360deg);
          animation: beti-trust-rotate 3.8s linear infinite;
        }
        .beti-trust__face {
          position: relative; z-index: 1; display: inline-flex; align-items: center;
          border-radius: 999px; background: var(--gradient,linear-gradient(135deg,#5A3DF0,#7C5CFF));
          color: #fff; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap;
        }
        .beti-trust__shine { position: absolute; inset: 0; z-index: 2; border-radius: inherit; overflow: hidden; pointer-events: none; }
        .beti-trust__shine::after {
          content: ""; position: absolute; top: 0; left: 0; width: 35%; height: 100%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
          animation: beti-trust-shine 3.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .beti-trust::before { animation: none; }
          .beti-trust__shine::after { animation: none; opacity: 0; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="beti-trust"
        style={{ ['--ring' as any]: sm ? '1.5px' : '2px', direction: isAr ? 'rtl' : 'ltr' }}
      >
        <span className="beti-trust__face" style={{ gap: sm ? 6 : 8, padding: sm ? '7px 16px' : '11px 22px', fontSize: sm ? 12 : 13.5 }}>
          <Award size={sm ? 13 : 15} fill="rgba(255,255,255,.25)" strokeWidth={2.2} />
          {displayLabel}
        </span>
        <span className="beti-trust__shine" />
      </button>

      {/* Popup de certification */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 380, borderRadius: 24,
              background: 'var(--bg2,#111)', border: '1px solid color-mix(in srgb,#5A3DF0 30%,transparent)',
              boxShadow: '0 24px 64px rgba(0,0,0,.6), 0 0 0 1px color-mix(in srgb,#5A3DF0 15%,transparent)',
              overflow: 'hidden',
              animation: 'beti-trust-popup .25s ease',
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            {/* Header violet dégradé */}
            <div style={{
              background: 'linear-gradient(135deg,#5A3DF0,#7C5CFF)',
              padding: '28px 28px 24px',
              position: 'relative',
            }}>
              <button
                onClick={() => setOpen(false)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(255,255,255,.15)',
                  border: '2px solid rgba(255,255,255,.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 28px rgba(255,255,255,.25)',
                }}>
                  <ShieldCheck size={32} color="#fff" strokeWidth={1.8} />
                </div>
              </div>
              <div style={{ textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'Nexa,sans-serif', marginBottom: 4 }}>
                {t('trust.certified')}
              </div>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 300, fontFamily: 'Nexa,sans-serif' }}>
                {t('trust.certifiedSub')}
              </div>
            </div>

            {/* Corps */}
            <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { key: 'id',      Icon: BadgeCheck,  tk: 'trust.id',      dk: 'trust.idDesc' },
                { key: 'skills',  Icon: Star,        tk: 'trust.skills',  dk: 'trust.skillsDesc' },
                { key: 'quality', Icon: ShieldCheck, tk: 'trust.quality', dk: 'trust.qualityDesc' },
              ] as const).map(({ key, Icon, tk, dk }) => (
                <div key={key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 36, height: 36, borderRadius: 10,
                    background: 'color-mix(in srgb,#5A3DF0 12%,var(--bg,#000))',
                    border: '1px solid color-mix(in srgb,#5A3DF0 25%,transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color="#7C5CFF" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx,#fff)', fontFamily: 'Nexa,sans-serif', marginBottom: 2 }}>{t(tk)}</div>
                    <div style={{ fontSize: 12, color: 'var(--tx3,#888)', fontWeight: 300, fontFamily: 'Nexa,sans-serif', lineHeight: 1.6 }}>{t(dk)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
