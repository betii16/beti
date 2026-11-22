'use client'

// Page d'une demande acceptée, côté client : la position de l'artisan sur une carte,
// tant qu'il la partage. La base ne la montre qu'au client de la demande, et seulement
// si elle a moins de 15 minutes (règle live_location_select).
// Fond de carte : OpenFreeMap (gratuit, sans clé), ouvert dans la CSP de next.config.mjs.

import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { createClient } from '@/lib/supabase/browser'

export type LivePosition = { lat: number; lng: number; updated_at: string }

const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export function LiveMap({ lang, artisanId, initial, t }: { lang: Locale; artisanId: string; initial: LivePosition | null; t: Dictionary['booking'] }) {
  const [position, setPosition] = useState(initial)
  const [failed, setFailed] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<{ map: MapLibreMap; marker: Marker } | null>(null)
  const loading = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`position:${artisanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artisan_live_location', filter: `artisan_id=eq.${artisanId}` }, payload => {
        if (payload.eventType === 'DELETE') return setPosition(null)
        const { lat, lng, updated_at } = payload.new as LivePosition
        setPosition({ lat, lng, updated_at })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [artisanId])

  // La carte n'est créée (et MapLibre chargé) qu'à la première position reçue ; ensuite le repère se déplace.
  useEffect(() => {
    if (!position || !container.current) return
    const at: [number, number] = [position.lng, position.lat]
    if (view.current) {
      view.current.marker.setLngLat(at)
      // Le bloc a pu être masqué entre-temps (partage coupé puis repris).
      view.current.map.resize()
      view.current.map.easeTo({ center: at })
      return
    }
    if (loading.current) return
    loading.current = true
    const node = container.current
    import('maplibre-gl')
      .then(({ Map, Marker, setWorkerUrl }) => {
        // Copie servie par le site (tests/unit/maplibre.test.ts vérifie qu'elle suit la version installée).
        setWorkerUrl('/maplibre-gl-worker.mjs')
        // shortcut: carte fixe qui suit l'artisan, sans zoom ni déplacement ; à ouvrir aux gestes si on le demande.
        const map = new Map({ container: node, style: STYLE, center: at, zoom: 14, interactive: false })
        // Une tuile qui manque n'empêche pas de voir le repère : c'est consigné, pas affiché.
        map.on('error', event => console.error('[beti] carte', event.error))
        map.on('load', () => {
          // Sans module d'écriture de droite à gauche, MapLibre dessine mal l'arabe : on garde les noms en lettres latines.
          for (const layer of map.getStyle().layers) {
            if (layer.type === 'symbol' && JSON.stringify(layer.layout?.['text-field'] ?? '').includes('name')) {
              map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:fr'], ['get', 'name:latin']])
            }
          }
        })
        const dot = document.createElement('div')
        dot.className = 'size-7 rounded-full border-4 border-ink bg-accent shadow-float'
        view.current = { map, marker: new Marker({ element: dot }).setLngLat(at).addTo(map) }
      })
      .catch(error => {
        // Appareil sans WebGL, ou MapLibre non chargé : l'heure de la dernière position reste affichée.
        console.error('[beti] carte non affichée', error)
        setFailed(true)
      })
  }, [position])

  useEffect(
    () => () => {
      view.current?.map.remove()
      view.current = null
    },
    [],
  )

  const time = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Algiers' })

  return (
    <div className="flex max-w-[680px] flex-col gap-2.5">
      <div
        ref={container}
        role="img"
        aria-label={t.mapLabel}
        // La carte ne suit pas le sens de lecture de la page.
        dir="ltr"
        className={position && !failed ? 'h-[320px] w-full overflow-hidden rounded-[28px] bg-mist' : 'hidden'}
      />
      {failed && <p className="text-body">{t.mapError}</p>}
      <p role="status" className={position ? 'font-medium' : 'text-body'}>
        {position ? t.locationAt.replace('{time}', time.format(new Date(position.updated_at))) : t.locationWaiting}
      </p>
    </div>
  )
}
