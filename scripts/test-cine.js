// scripts/test-cine.js — vérification headless de l'expérience cinématique.
// Ouvre /?cine=1 en viewport desktop, attend le chargement du modèle,
// scrolle à travers les sections et capture des screenshots.
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

  await page.goto('http://localhost:3000/?cine=1', { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(6000) // chargement GLB + fade du loader
  await page.screenshot({ path: 'scripts/cine-1-hero.png' })

  // WebGL actif ?
  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'))

  // Scroll dans le wrapper interne (Lenis)
  const scroll = async (y) => {
    await page.evaluate((v) => {
      const w = document.querySelector('.cine-scroll')
      if (w) w.scrollTop = v
    }, y)
    await page.waitForTimeout(2200)
  }
  const max = await page.evaluate(() => {
    const w = document.querySelector('.cine-scroll')
    return w ? w.scrollHeight - w.clientHeight : 0
  })
  // Milieu de la fenêtre sticky de chaque section (hero 100vh + sections 170vh)
  await scroll(max * 0.135); await page.screenshot({ path: 'scripts/cine-s1-plomberie.png' })
  await scroll(max * 0.30);  await page.screenshot({ path: 'scripts/cine-s2-electricite.png' })
  await scroll(max * 0.47);  await page.screenshot({ path: 'scripts/cine-s3-menuiserie.png' })
  await scroll(max * 0.63);  await page.screenshot({ path: 'scripts/cine-s4-peinture.png' })
  await scroll(max * 0.80);  await page.screenshot({ path: 'scripts/cine-s5-clim.png' })
  await scroll(max * 0.99);  await page.screenshot({ path: 'scripts/cine-s6-final.png' })

  console.log(JSON.stringify({ hasCanvas, maxScroll: max, errors: errors.slice(0, 8) }, null, 2))
  await browser.close()
})().catch(e => { console.error('FATAL', e.message); process.exit(1) })
