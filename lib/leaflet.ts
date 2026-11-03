// lib/leaflet.ts
// Types minimaux de Leaflet (charge depuis un CDN, sans paquet @types) et de
// la reponse Nominatim, partages par AddressPicker et ArtisanZonePicker.

export interface LeafletLatLng { lat: number; lng: number }
export interface LeafletEvent { target: { getLatLng(): LeafletLatLng }; latlng: LeafletLatLng }
export interface LeafletLayer {
  addTo(map: LeafletMap): this
  setLatLng(pos: [number, number]): this
  on(type: string, fn: (e: LeafletEvent) => void | Promise<void>): this
}
export interface LeafletCircle extends LeafletLayer {
  setRadius(m: number): this
  getBounds(): unknown
}
export interface LeafletMap {
  setView(pos: [number, number], zoom: number, opts?: { animate?: boolean }): this
  fitBounds(bounds: unknown, opts?: { padding?: [number, number] }): this
  invalidateSize(): void
  remove(): void
  on(type: string, fn: (e: LeafletEvent) => void | Promise<void>): this
}
export interface LeafletStatic {
  map(el: HTMLElement, opts: Record<string, unknown>): LeafletMap
  tileLayer(url: string, opts: Record<string, unknown>): { addTo(map: LeafletMap): unknown }
  control: { zoom(opts: { position: string }): { addTo(map: LeafletMap): unknown } }
  divIcon(opts: Record<string, unknown>): unknown
  marker(pos: [number, number], opts: Record<string, unknown>): LeafletLayer
  circle(pos: [number, number], opts: Record<string, unknown>): LeafletCircle
}

export function getLeaflet(): LeafletStatic {
  return (window as unknown as { L: LeafletStatic }).L
}
export function hasLeaflet(): boolean {
  return !!(window as unknown as { L?: LeafletStatic }).L
}

export interface NominatimResult {
  lat: string; lon: string; display_name: string; name?: string
  address?: Record<string, string | undefined>
}
