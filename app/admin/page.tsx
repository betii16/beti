'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'artisans' | 'bookings' | 'users'

type StatCard = {
  label: string
  value: string
  change: string
  positive: boolean
}

// ── Données démo ─────────────────────────────────────────────────

const STATS: StatCard[] = [
  { label: 'Revenus ce mois',     value: '8 420 €',  change: '+12%',  positive: true  },
  { label: 'Réservations',        value: '184',       change: '+8%',   positive: true  },
  { label: 'Nouveaux utilisateurs', value: '47',      change: '+23%',  positive: true  },
  { label: 'Artisans actifs',     value: '38',        change: '-2',    positive: false },
]

const DEMO_ARTISANS = [
  { id: 1, name: 'Jean Dupont',   category: 'Plombier',      city: 'Paris',  status: 'active',  rating: 4.9, missions: 312, joined: '12/01/2025' },
  { id: 2, name: 'Marie Laurent', category: 'Électricienne', city: 'Lyon',   status: 'pending', rating: 0,   missions: 0,   joined: '14/03/2026' },
  { id: 3, name: 'Karim Seddik',  category: 'Peintre',       city: 'Paris',  status: 'active',  rating: 4.7, missions: 145, joined: '05/02/2025' },
  { id: 4, name: 'Amina Benali',  category: 'Ménage',        city: 'Marseille', status: 'active', rating: 5.0, missions: 521, joined: '20/11/2024' },
  { id: 5, name: 'Thomas Petit',  category: 'Serrurier',     city: 'Paris',  status: 'suspended', rating: 3.2, missions: 12, joined: '01/03/2026' },
]

const DEMO_BOOKINGS = [
  { id: 1, client: 'Sophie M.',  artisan: 'Jean Dupont',   service: 'Fuite évier',       amount: 90,  status: 'completed', date: '14/03/2026' },
  { id: 2, client: 'Marc T.',    artisan: 'Marie Laurent', service: 'Prise électrique',  amount: 110, status: 'pending',   date: '15/03/2026' },
  { id: 3, client: 'Amina B.',   artisan: 'Karim Seddik',  service: 'Peinture salon',    amount: 350, status: 'accepted',  date: '16/03/2026' },
  { id: 4, client: 'Pierre L.',  artisan: 'Amina Benali',  service: 'Ménage complet',    amount: 75,  status: 'completed', date: '13/03/2026' },
  { id: 5, client: 'Julie R.',   artisan: 'Thomas Petit',  service: 'Serrure bloquée',   amount: 120, status: 'cancelled', date: '12/03/2026' },
]

// ── Helpers ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active:    { label: 'Actif',     bg: '#0a2010', color: '#4ade80', border: '#0a3a20' },
  pending:   { label: 'En attente', bg: '#2a2010', color: '#C9A84C', border: '#3a3010' },
  suspended: { label: 'Suspendu',  bg: '#1a0a0a', color: '#f87171', border: '#2a1010' },
  completed: { label: 'Terminé',   bg: '#0a2010', color: '#4ade80', border: '#0a3a20' },
  accepted:  { label: 'Accepté',   bg: '#0d1a2a', color: '#60a5fa', border: '#1a2a3a' },
  cancelled: { label: 'Annulé',    bg: '#1a1010', color: '#666',    border: '#2a1a1a' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Page principale ───────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview')
  const [artisans, setArtisans] = useState(DEMO_ARTISANS)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleArtisanAction = (id: number, action: 'active' | 'suspended') => {
    setArtisans(prev => prev.map(a => a.id === id ? { ...a, status: action } : a))
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D12; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #0D0D12; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
        table { border-collapse: collapse; width: 100%; }
        th { font-size: 11px; font-weight: 500; color: #555; letter-spacing: 0.06em; padding: 12px 16px; text-align: left; border-bottom: 0.5px solid #2a2a3a; }
        td { font-size: 13px; color: #F0EDE8; padding: 14px 16px; border-bottom: 0.5px solid #1e1e2a; }
        tr:hover td { background: #1a1a24; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0D12' }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 220, background: '#09090f',
          borderRight: '0.5px solid #1e1e2a',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh',
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{
            padding: '24px 20px', borderBottom: '0.5px solid #1e1e2a',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, background: '#C9A84C', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 500, color: '#0D0D12',
              fontFamily: 'Cormorant Garamond, Georgia, serif',
            }}>B</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8', letterSpacing: '0.06em' }}>BETI</div>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>ADMIN</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {[
              { id: 'overview', icon: '◈', label: 'Vue d\'ensemble' },
              { id: 'artisans', icon: '👷', label: 'Artisans' },
              { id: 'bookings', icon: '📋', label: 'Réservations' },
              { id: 'users',    icon: '👤', label: 'Utilisateurs' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as Tab)}
                style={{
                  width: '100%', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: tab === item.id ? '#1a1508' : 'transparent',
                  border: tab === item.id ? '0.5px solid #2a2010' : '0.5px solid transparent',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  color: tab === item.id ? '#C9A84C' : '#555',
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Footer sidebar */}
          <div style={{ padding: '16px 20px', borderTop: '0.5px solid #1e1e2a' }}>
            <a href="/" style={{
              fontSize: 12, color: '#444', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Retour au site
            </a>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <main style={{ flex: 1, overflow: 'auto' }}>

          {/* Header */}
          <div style={{
            padding: '24px 32px', borderBottom: '0.5px solid #1e1e2a',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#09090f', position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', marginBottom: 4 }}>
                TABLEAU DE BORD
              </div>
              <h1 style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: 24, fontWeight: 500, color: '#F0EDE8',
              }}>
                {{ overview: 'Vue d\'ensemble', artisans: 'Gestion des artisans', bookings: 'Réservations', users: 'Utilisateurs' }[tab]}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontSize: 12, color: '#555',
                padding: '6px 12px', background: '#161620',
                border: '0.5px solid #2a2a3a', borderRadius: 8,
              }}>
                {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#2a2010', border: '0.5px solid #3a3010',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#C9A84C', fontWeight: 500,
              }}>A</div>
            </div>
          </div>

          <div style={{ padding: '32px' }}>

            {/* ── Onglet Vue d'ensemble ── */}
            {tab === 'overview' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                {/* Stats cards */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16, marginBottom: 32,
                }}>
                  {STATS.map(s => (
                    <div key={s.label} style={{
                      background: '#161620', border: '0.5px solid #2a2a3a',
                      borderRadius: 14, padding: '20px 22px',
                    }}>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>{s.label}</div>
                      <div style={{
                        fontFamily: 'Cormorant Garamond, Georgia, serif',
                        fontSize: 32, fontWeight: 500, color: '#F0EDE8', marginBottom: 8,
                      }}>{s.value}</div>
                      <div style={{
                        fontSize: 11, fontWeight: 500,
                        color: s.positive ? '#4ade80' : '#f87171',
                      }}>
                        {s.change} vs mois dernier
                      </div>
                    </div>
                  ))}
                </div>

                {/* Artisans en attente */}
                <div style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, overflow: 'hidden', marginBottom: 24,
                }}>
                  <div style={{
                    padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8' }}>
                      Artisans en attente de validation
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20,
                      background: '#2a2010', color: '#C9A84C',
                      border: '0.5px solid #3a3010', fontSize: 11, fontWeight: 500,
                    }}>
                      {artisans.filter(a => a.status === 'pending').length} en attente
                    </span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>ARTISAN</th>
                        <th>CATÉGORIE</th>
                        <th>VILLE</th>
                        <th>INSCRIPTION</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artisans.filter(a => a.status === 'pending').map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 500 }}>{a.name}</td>
                          <td style={{ color: '#888' }}>{a.category}</td>
                          <td style={{ color: '#888' }}>{a.city}</td>
                          <td style={{ color: '#555' }}>{a.joined}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleArtisanAction(a.id, 'active')}
                                style={{
                                  padding: '5px 14px', borderRadius: 8,
                                  background: '#0a2010', border: '0.5px solid #0a3a20',
                                  color: '#4ade80', fontSize: 12, cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                              >Valider</button>
                              <button
                                onClick={() => handleArtisanAction(a.id, 'suspended')}
                                style={{
                                  padding: '5px 14px', borderRadius: 8,
                                  background: '#1a0a0a', border: '0.5px solid #2a1010',
                                  color: '#f87171', fontSize: 12, cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                              >Refuser</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {artisans.filter(a => a.status === 'pending').length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#444', padding: '32px' }}>
                            Aucun artisan en attente ✓
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Dernières réservations */}
                <div style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, overflow: 'hidden',
                }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a' }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8' }}>
                      Dernières réservations
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>CLIENT</th>
                        <th>ARTISAN</th>
                        <th>SERVICE</th>
                        <th>MONTANT</th>
                        <th>DATE</th>
                        <th>STATUT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_BOOKINGS.slice(0, 4).map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 500 }}>{b.client}</td>
                          <td style={{ color: '#888' }}>{b.artisan}</td>
                          <td style={{ color: '#888' }}>{b.service}</td>
                          <td style={{ color: '#C9A84C', fontWeight: 500 }}>{b.amount} €</td>
                          <td style={{ color: '#555' }}>{b.date}</td>
                          <td><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Onglet Artisans ── */}
            {tab === 'artisans' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8' }}>
                      Tous les artisans ({artisans.length})
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Tous', 'Actifs', 'En attente', 'Suspendus'].map(f => (
                        <button key={f} style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 11,
                          background: f === 'Tous' ? '#2a2010' : 'transparent',
                          border: `0.5px solid ${f === 'Tous' ? '#3a3010' : '#2a2a3a'}`,
                          color: f === 'Tous' ? '#C9A84C' : '#555',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>ARTISAN</th>
                        <th>CATÉGORIE</th>
                        <th>VILLE</th>
                        <th>NOTE</th>
                        <th>MISSIONS</th>
                        <th>STATUT</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artisans.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: '#2a2010', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 11, color: '#C9A84C', fontWeight: 500,
                              }}>
                                {a.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span style={{ fontWeight: 500 }}>{a.name}</span>
                            </div>
                          </td>
                          <td style={{ color: '#888' }}>{a.category}</td>
                          <td style={{ color: '#888' }}>{a.city}</td>
                          <td style={{ color: a.rating > 0 ? '#C9A84C' : '#444' }}>
                            {a.rating > 0 ? `⭐ ${a.rating}` : '—'}
                          </td>
                          <td style={{ color: '#888' }}>{a.missions}</td>
                          <td><StatusBadge status={a.status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {a.status !== 'active' && (
                                <button onClick={() => handleArtisanAction(a.id, 'active')} style={{
                                  padding: '4px 10px', borderRadius: 6,
                                  background: '#0a2010', border: '0.5px solid #0a3a20',
                                  color: '#4ade80', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                }}>Activer</button>
                              )}
                              {a.status !== 'suspended' && (
                                <button onClick={() => handleArtisanAction(a.id, 'suspended')} style={{
                                  padding: '4px 10px', borderRadius: 6,
                                  background: '#1a0a0a', border: '0.5px solid #2a1010',
                                  color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                }}>Suspendre</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Onglet Réservations ── */}
            {tab === 'bookings' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, overflow: 'hidden',
                }}>
                  <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2a2a3a' }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8' }}>
                      Toutes les réservations ({DEMO_BOOKINGS.length})
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>CLIENT</th>
                        <th>ARTISAN</th>
                        <th>SERVICE</th>
                        <th>MONTANT</th>
                        <th>DATE</th>
                        <th>STATUT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO_BOOKINGS.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 500 }}>{b.client}</td>
                          <td style={{ color: '#888' }}>{b.artisan}</td>
                          <td style={{ color: '#888' }}>{b.service}</td>
                          <td style={{ color: '#C9A84C', fontWeight: 500 }}>{b.amount} €</td>
                          <td style={{ color: '#555' }}>{b.date}</td>
                          <td><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Onglet Utilisateurs ── */}
            {tab === 'users' && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                <div style={{
                  background: '#161620', border: '0.5px solid #2a2a3a',
                  borderRadius: 14, padding: '48px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                  <div style={{
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontSize: 22, color: '#F0EDE8', marginBottom: 10,
                  }}>Gestion des utilisateurs</div>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    Connectez Supabase pour voir les vrais utilisateurs
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  )
}
