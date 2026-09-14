import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const failures=[];
page.on('pageerror',e=>failures.push(`pageerror: ${e.message}`));
page.on('console',m=>{if(m.type()==='error')failures.push(`console: ${m.text()}`)});
const response=await page.goto('http://127.0.0.1:4173/v17.html',{waitUntil:'domcontentloaded',timeout:30000});
if(!response||!response.ok())failures.push(`navigation status: ${response?.status()??'none'}`);
await page.waitForTimeout(5000);
const state=await page.evaluate(()=>({
  title:document.title,
  canvasCount:document.querySelectorAll('canvas').length,
  canvasVisible:[...document.querySelectorAll('canvas')].some(c=>c.clientWidth>500&&c.clientHeight>300),
  reticle:!!document.getElementById('reticle'),
  target:!!document.getElementById('target'),
  coach:!!document.getElementById('coach'),
  boot:!!document.getElementById('boot'),
  v17:window.__emberwingV17?.snapshot?.()??null,
  bodyText:document.body.innerText.slice(0,500)
}));
if(!/Emberwing V17/i.test(state.title))failures.push(`unexpected title: ${state.title}`);
if(state.canvasCount!==1)failures.push(`expected one canvas, found ${state.canvasCount}`);
if(!state.canvasVisible)failures.push('game canvas not visibly sized');
if(!state.reticle||!state.target||!state.coach)failures.push('core HUD missing');
if(state.boot)failures.push('wrapper boot element present');
if(!state.v17)failures.push('V17 runtime hook missing');
if((state.v17?.needles??0)<7)failures.push('desert skyline missing');
if((state.v17?.spine??0)<9)failures.push('alpine spine missing');
if(!state.v17?.sun)failures.push('eclipse sun missing');
if(/LOAD ERROR|MONK MODE \/\//i.test(state.bodyText))failures.push(`bad boot/error text visible: ${state.bodyText}`);
await page.screenshot({path:'/tmp/emberwing-v17-desert.png',fullPage:true});
await browser.close();
if(failures.length){console.error('V17 SMOKE TEST FAILED');for(const f of failures)console.error('-',f);process.exit(1)}
console.log('V17 SMOKE TEST PASSED');console.log(JSON.stringify(state,null,2));
