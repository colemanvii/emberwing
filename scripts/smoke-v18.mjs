import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures=[];
page.on('pageerror',e=>failures.push(`pageerror: ${e.message}`));
page.on('console',m=>{if(m.type()==='error')failures.push(`console: ${m.text()}`)});
const response=await page.goto('http://127.0.0.1:4173/v18.html',{waitUntil:'domcontentloaded',timeout:30000});
if(!response||!response.ok())failures.push(`navigation status: ${response?.status()??'none'}`);
await page.waitForTimeout(5000);
const state=await page.evaluate(()=>{
  const s=window.__emberwingV18?.snapshot?.()??null;
  return {
    title:document.title,
    canvas:[...document.querySelectorAll('canvas')].some(c=>c.clientWidth>500&&c.clientHeight>300),
    reticle:!!document.getElementById('reticle'),
    target:!!document.getElementById('target'),
    coach:!!document.getElementById('coach'),
    boot:!!document.getElementById('boot'),
    state:s,
    body:document.body.innerText.slice(0,400)
  }
});
if(!/Emberwing V18/i.test(state.title))failures.push(`bad title ${state.title}`);
if(!state.canvas)failures.push('canvas not visible');
if(!state.reticle||!state.target||!state.coach)failures.push('core HUD missing');
if(state.boot)failures.push('wrapper boot element present');
if(!state.state)failures.push('V18 runtime hook missing');
if((state.state?.sceneryCount??99)>8)failures.push(`legacy scenery still present: ${state.state?.sceneryCount}`);
if(!state.state?.gate||!state.state?.horizon)failures.push('desert rebuild not visible');
if((state.state?.gateParts??0)<3||(state.state?.horizonParts??0)<6)failures.push('desert monumental geometry incomplete');
if(state.state?.legacyHero)failures.push('legacy V11 hero visible');
if(/LOAD ERROR|MONK MODE \/\//i.test(state.body))failures.push('dev/boot text visible');
await page.screenshot({path:'/tmp/emberwing-v18-desert.png',fullPage:true});
await browser.close();
if(failures.length){console.error('V18 SMOKE TEST FAILED');for(const f of failures)console.error('- '+f);process.exit(1)}
console.log('V18 SMOKE TEST PASSED');
console.log(JSON.stringify(state,null,2));
