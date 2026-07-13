// scripts/cine-cam.js — capture une pose caméra précise de l'expérience 3D.
// Usage : node scripts/cine-cam.js "x,y,z,tx,ty,tz" sortie.png
const { chromium } = require('playwright')

;(async () => {
  const [pose, out] = process.argv.slice(2)
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`http://localhost:3000/?cine=1&cineCam=${pose}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(7000)
  // Cache tout l'habillage HTML : seule la scène 3D reste visible
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const root = document.querySelector('.cine-scroll')?.parentElement
    if (root && canvas) Array.from(root.children).forEach(el => {
      if (!el.contains(canvas)) el.style.visibility = 'hidden'
    })
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: out })
  await browser.close()
  console.log('saved', out)
})().catch(e => { console.error('FATAL', e.message); process.exit(1) })
