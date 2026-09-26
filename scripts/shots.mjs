import { chromium } from 'playwright'

const routes = process.argv.slice(2)
const pages = routes.length ? routes : ['/']

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })

// Seed localStorage so we skip the language picker + first-visit intro and
// land straight on the real page.
const seed = {
  'beti-lang': 'fr',
  'beti-intro-done': '1',
  'beti-cine-done': '1',
  'beti-theme': 'light',
}

async function shot(route, device, opts) {
  const slug = (route.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'home')
  const ctx = await browser.newContext(opts)
  await ctx.addInitScript((s) => {
    for (const k in s) localStorage.setItem(k, s[k])
  }, seed)
  const p = await ctx.newPage()
  try {
    await p.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 45000 })
    await p.waitForTimeout(1000)
    // Trigger reveal-on-scroll animations by stepping through the page.
    await p.evaluate(async () => {
      const step = window.innerHeight * 0.7
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise(r => setTimeout(r, 200))
      }
      window.scrollTo(0, 0)
      await new Promise(r => setTimeout(r, 400))
    })
    await p.waitForTimeout(600)
    await p.screenshot({ path: `scripts/shot_${slug}_${device}.png`, fullPage: true })
    console.log('OK', device, route)
  } catch (e) { console.log('ERR', device, route, e.message) }
  await ctx.close()
}

for (const route of pages) {
  await shot(route, 'desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await shot(route, 'mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
}

await browser.close()
