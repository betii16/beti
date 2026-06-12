// Test interactif : le sélecteur de pays s'ouvre-t-il au tap mobile ?
import { chromium, devices } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'fr-FR' })
const page = await ctx.newPage()

await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' })

// Tap sur le bouton indicatif (+213)
await page.tap('button:has-text("+213")')
await page.waitForTimeout(600)

const visible = await page.isVisible('text=France')
console.log(visible ? 'OK — dropdown ouvert, France visible' : 'ECHEC — dropdown fermé')

await page.screenshot({ path: 'C:/Users/pc/Desktop/betii/.screenshots/country-picker.png' })

// Sélectionner la France
if (visible) {
  await page.tap('text=France')
  await page.waitForTimeout(400)
  const cc = await page.textContent('button:has-text("+33")').catch(() => null)
  console.log(cc ? 'OK — France sélectionnée (+33)' : 'ECHEC — sélection inopérante')
  await page.screenshot({ path: 'C:/Users/pc/Desktop/betii/.screenshots/country-picked.png' })
}

await browser.close()
