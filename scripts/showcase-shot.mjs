import { chromium } from 'playwright'
import { pathToFileURL } from 'url'
import path from 'path'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:2 })
const p = await ctx.newPage()
const url = pathToFileURL(path.resolve('showcase.html')).href
await p.goto(url, { waitUntil:'networkidle' })
await p.waitForTimeout(1800)
await p.screenshot({ path:'scripts/showcase_full.png', fullPage:true })
await p.setViewportSize({width:1440,height:860})
await p.screenshot({ path:'scripts/showcase_hero.png' })
await b.close(); console.log('OK', url)
