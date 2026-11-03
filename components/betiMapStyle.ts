// Style de carte « Chaux & Zellige » dérivé des styles CARTO (mêmes tuiles).
// On télécharge le style d'origine puis on repeint couches par couches :
// terre = chaux / nuit, eau teintée, routes discrètes, labels en encre,
// POI et numéros masqués, labels de lieux moins denses.

import type { StyleSpecification } from 'maplibre-gl'

type Theme = 'light' | 'dark'
type Lang = 'fr' | 'ar'

const SRC: Record<Theme, string> = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

const PALETTE = {
  light: { land: '#F0ECE3', park: '#E3E6D4', water: '#C7D8E2', road: '#FFFFFF', roadMinor: '#FBF9F4', casing: '#E0D9C9', building: '#E6E0D2', ink: '#17242F', ink2: '#5A6670', halo: '#F0ECE3', rail: '#D6CFBF' },
  dark: { land: '#13212C', park: '#16302B', water: '#1B3D55', road: '#5B7488', roadMinor: '#3E5568', casing: '#0F1A23', building: '#1C2F3E', ink: '#E9E4D8', ink2: '#B3BEC6', halo: '#13212C', rail: '#2A3F50' },
} as const

const cache = new Map<string, Promise<StyleSpecification>>()

export function loadBetiStyle(theme: Theme, lang: Lang): Promise<StyleSpecification> {
  const key = `${theme}-${lang}`
  let p = cache.get(key)
  if (!p) {
    p = fetch(SRC[theme]).then(r => { if (!r.ok) throw new Error('style'); return r.json() }).then(s => restyle(s, theme, lang))
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

const HIDE = /^(poi_|housenumber|watername_lake_pois|waterway_label|boundary_|aeroway|building-top|tunnel_|rail|road_path_areas|roadname_minor|place_country|place_continent|place_state|water_shadow|landcover$)/

type LooseLayer = { id: string; type: string; minzoom?: number; paint?: Record<string, unknown>; layout?: Record<string, unknown> }

function restyle(style: { layers: LooseLayer[] }, theme: Theme, lang: Lang): StyleSpecification {
  const c = PALETTE[theme]
  const nameField: unknown[] = lang === 'ar'
    ? ['coalesce', ['get', 'name:ar'], ['get', 'name']]
    : ['coalesce', ['get', 'name:fr'], ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]

  style.layers = style.layers.map((l): LooseLayer => {
    const id: string = l.id
    l.paint = { ...(l.paint || {}) }
    l.layout = { ...(l.layout || {}) }
    if (HIDE.test(id)) { l.layout.visibility = 'none'; return l }

    if (l.type === 'background') { l.paint['background-color'] = c.land; return l }
    if (l.type === 'fill') {
      if (id === 'water') l.paint['fill-color'] = c.water
      else if (id.startsWith('park')) l.paint['fill-color'] = c.park
      else if (id === 'building') { l.paint['fill-color'] = c.building; l.paint['fill-opacity'] = 0.85; delete l.paint['fill-antialias'] }
      else l.paint['fill-color'] = c.land // landuse, résidentiel : à plat, la terre reste calme
      return l
    }
    if (l.type === 'line') {
      if (id === 'waterway') { l.paint['line-color'] = c.water; return l }
      if (id.endsWith('_case')) { l.paint['line-color'] = c.casing; return l }
      if (id.endsWith('_fill')) { l.paint['line-color'] = /minor|service/.test(id) ? c.roadMinor : c.road; return l }
      if (id.includes('path')) { l.paint['line-color'] = c.casing; l.paint['line-opacity'] = 0.6; return l }
      return l
    }
    if (l.type === 'symbol') {
      l.layout['icon-image'] = ''
      l.layout['text-transform'] = 'none'
      l.layout['text-padding'] = 10
      if (id.startsWith('place_') || id.startsWith('watername')) l.layout['text-field'] = nameField
      else if (id.startsWith('roadname')) l.layout['text-field'] = nameField
      if (id === 'place_hamlet' || id === 'place_villages') { l.layout.visibility = 'none'; return l }
      if (id === 'place_suburbs') l.minzoom = 13
      const water = id.startsWith('watername')
      l.paint['text-color'] = water ? (theme === 'light' ? '#4F7A91' : '#6E9AB0') : id.startsWith('roadname') ? c.ink2 : c.ink
      l.paint['text-halo-color'] = water ? c.water : c.halo
      l.paint['text-halo-width'] = 1.4
      return l
    }
    return l
  })
  return style as unknown as StyleSpecification
}
