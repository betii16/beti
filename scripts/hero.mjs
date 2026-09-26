import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--enable-unsafe-swiftshader'] })
async function shot(name, opts, full=false){
  const ctx = await b.newContext(opts)
  await ctx.addInitScript(()=>{ localStorage.setItem('beti-lang','fr'); localStorage.setItem('beti-intro-done','1'); localStorage.setItem('beti-cine-done','1'); localStorage.setItem('beti-theme','light') })
  const p = await ctx.newPage()
  await p.goto('http://localhost:3000/', { waitUntil:'networkidle' })
  await p.waitForTimeout(1600)
  if(full){ await p.evaluate(async()=>{for(let y=0;y<2200;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,180))}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,300))}) }
  await p.screenshot({ path:`scripts/${name}.png` })
  await ctx.close(); console.log('OK',name)
}
await shot('h_desk', { viewport:{width:1440,height:1550} }, true)
await shot('h_mob', { viewport:{width:390,height:900}, deviceScaleFactor:2, isMobile:true, hasTouch:true }, true)
await b.close()
