// Capture d'écran mobile (iPhone 13) des pages clés — vérification visuelle locale.
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = 'C:/Users/pc/Desktop/betii/.screenshots'
const iphone = devices['iPhone 13']

const shots = [
  { path: '/', name: 'home-top' },
  { path: '/', name: 'home-artisans', scrollTo: '#artisans' },
  { path: '/map', name: 'map', wait: 4000 },
  { path: '/auth/login', name: 'login' },
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...iphone, locale: 'fr-FR' })
const page = await ctx.newPage()

import { mkdirSync } from 'fs'
mkdirSync(OUT, { recursive: true })

for (const s of shots) {
  await page.goto(BASE + s.path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  if (s.scrollTo) {
    await page.evaluate(sel => document.querySelector(sel)?.scrollIntoView(), s.scrollTo)
    await page.waitForTimeout(1200)
  }
  if (s.wait) await page.waitForTimeout(s.wait)
  await page.screenshot({ path: `${OUT}/${s.name}.png` })
  console.log(`OK ${s.name}`)
}

await browser.close()
