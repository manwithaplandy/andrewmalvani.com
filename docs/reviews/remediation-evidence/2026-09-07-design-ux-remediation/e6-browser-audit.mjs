import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';
const prefix='.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/e6-';
const origin='http://127.0.0.1:3104';
const result=JSON.parse(readFileSync(prefix+'browser-acceptance.json')); result.errors=[];
const browser=await chromium.launch();
const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block',viewport:{width:1280,height:900}});
let payload=JSON.parse(readFileSync('tests/fixtures/stats-v2-current.json'));
let releaseContact, contactCalls=0;
await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/contact'){
    const headers={'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};
    if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
    contactCalls++;result.journeys.push({contactPayload:route.request().postDataJSON()});
    await new Promise(resolve=>releaseContact=resolve);
    return route.abort('failed');
  }
  if(url.origin!==origin){result.blockedExternal.push(url.origin);return route.abort();}
  if(url.pathname==='/stats.json')return route.fulfill({json:payload});
  return route.continue();
});
const page=await context.newPage();
page.on('pageerror',error=>result.errors.push(error.message));
await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
async function capture(name,fullPage=false){
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(220);
  const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollY}));
  result.views.push({name,...geometry});
  await page.screenshot({path:prefix+name+'.png',fullPage});
  console.log('CAPTURE',name,JSON.stringify(geometry));
}
async function contrast(state){
  const rows=await page.evaluate(()=>{
    const parse=value=>{const p=value.match(/[\d.]+/g)?.map(Number)||[];return[p[0]||0,p[1]||0,p[2]||0,p[3]??1];};
    const over=(a,b)=>{const alpha=a[3]+b[3]*(1-a[3]);return alpha?[...a.slice(0,3).map((v,i)=>(v*a[3]+b[i]*b[3]*(1-a[3]))/alpha),alpha]:[0,0,0,0];};
    const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const all=[];
    for(const el of document.querySelectorAll('body *')){
      if(!(el instanceof HTMLElement)||['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)||el.closest('[aria-hidden="true"]')||el.classList.contains('sr-only'))continue;
      const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
      if(!text&&!['INPUT','TEXTAREA'].includes(el.tagName))continue;
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      if(!r.width||!r.height||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth||s.visibility!=='visible')continue;
      if(parseFloat(s.fontSize)>20)continue;
      const chain=[];let opacity=1;
      for(let a=el;a;a=a.parentElement){const st=getComputedStyle(a);chain.unshift(st);opacity*=Number(st.opacity);}
      if(opacity<.99){all.push({text:text.slice(0,110),skip:'unsettled/group opacity',opacity});continue;}
      let background=[255,255,255,1],imageLayer=false;
      for(const st of chain){const bg=parse(st.backgroundColor);if(bg[3]===1)imageLayer=false;if(st.backgroundImage!=='none')imageLayer=true;background=over(bg,background);}
      const samples=[{kind:'text',style:s,text}];
      if(el.matches('input,textarea')&&el.getAttribute('placeholder'))samples.push({kind:'placeholder',style:getComputedStyle(el,'::placeholder'),text:el.getAttribute('placeholder')});
      for(const sample of samples){
        const fg=parse(sample.style.color);fg[3]*=Number(sample.style.opacity);if(fg[3]===0)continue;
        const foreground=over(fg,background);
        const ratio=(Math.max(lum(foreground),lum(background))+.05)/(Math.min(lum(foreground),lum(background))+.05);
        all.push({text:sample.text.slice(0,110),tag:el.tagName,kind:sample.kind,color:sample.style.color,background,foreground,ratio:Number(ratio.toFixed(4)),fontSize:s.fontSize,imageLayer,disabled:el.matches(':disabled'),id:el.id,className:el.className});
      }
    }return all;
  });
  result.contrast.push({state,rows});
}
async function section(id){await page.locator('#'+id).evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(250);}
try{
for(const [width,height] of [[320,844],[390,844],[430,932],[844,390]]){
 await page.setViewportSize({width,height});await page.goto(origin+'/?utm_source=qa#top');
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://andrewmalvani.com/');
 if(width!==320){ await capture(`home-${width}`);await contrast(`home-${width}`);
 for(const id of ['resume','portfolio','contact']){await section(id);await capture(`${id}-${width}`);await contrast(`${id}-${width}`);}}
 if(width===320){
   await section('contact');
   await page.getByRole('button',{name:'Open menu',exact:true}).click();await capture('menu-320');await contrast('menu-320');
   await page.getByRole('link',{name:/^contact$/i}).click();await capture('contact-anchor-320');
   await page.getByRole('button',{name:'Send Message',exact:true}).click();
   await expect(page.locator('#contact-name')).toBeFocused();await capture('contact-invalid-320');await contrast('contact-invalid-320');
   await page.locator('#contact-name').fill('  QA Visitor  ');await page.locator('#contact-email').fill('visitor@example.test');await page.locator('#contact-message').fill('  Synthetic acceptance only.  ');
   await page.getByRole('button',{name:'Send Message',exact:true}).click();
   await expect(page.getByText('Sending your message. Fields are temporarily read-only.',{exact:true})).toBeVisible();
   await capture('contact-pending-320');await contrast('contact-pending-320');
   releaseContact();await expect(page.getByText(/Delivery could not be confirmed/)).toBeVisible();
   await expect(page.locator('#contact-message')).toHaveValue('  Synthetic acceptance only.  ');
   await capture('contact-uncertain-320');await contrast('contact-uncertain-320');
   result.journeys.push({contactCalls,preserved:true,pendingAndUncertainty:true});
 }
}
await page.setViewportSize({width:390,height:844});await page.goto(origin+'/#resume');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await capture('home-text200',true);await contrast('home-text200');
for(const [width,height] of [[1280,900],[320,844],[390,844],[430,932],[844,390]]){
 await page.setViewportSize({width,height});await page.goto(origin+'/graph?view=list');
 const input=page.getByRole('textbox',{name:'Find a role, skill, or achievement'});await input.fill('Python');
 const item=page.getByRole('search',{name:'Career search'}).getByRole('button',{name:'Python',exact:true});await item.focus();await page.keyboard.press('Enter');
 await expect(page.locator('[id="graph-details-skill:python"]')).toContainText('Primary language');
 await capture(`graph-list-${width}`);await contrast(`graph-list-${width}`);
 await page.getByRole('button',{name:'Show overview',exact:true}).click();
 await page.getByRole('button',{name:'3D view',exact:true}).click();
 await expect(page.locator('canvas')).toBeVisible({timeout:15000});await page.getByRole('application').scrollIntoViewIfNeeded();await page.waitForTimeout(750);
 await capture(`graph-overview-${width}`);await contrast(`graph-overview-${width}`);
 await input.fill('Georgia Tech');await page.getByRole('search',{name:'Career search'}).getByRole('button',{name:'M.S. Computer Science, Georgia Tech',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected career item'})).toBeVisible();
 await capture(`graph-selected-${width}`);await contrast(`graph-selected-${width}`);
 await page.getByRole('button',{name:'Show overview',exact:true}).click();
}
for(const hash of ['%','node=unknown','', 'node=skill%3Apython']){
 await page.goto(origin+'/graph?view=list#'+hash);await expect(page.getByRole('link',{name:'Classic resume',exact:true})).toBeVisible();
 result.journeys.push({graphHash:hash,title:await page.title(),listVisible:await page.getByRole('navigation',{name:'Career graph, list view'}).isVisible()});
}
await page.setViewportSize({width:390,height:844});await page.goto(origin+'/graph?view=list');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await capture('graph-text200',true);await contrast('graph-text200');
for(const [width,height] of [[1280,900],[320,844],[390,844],[844,390]]){
 await page.setViewportSize({width,height});await page.goto(origin+'/stats?utm_source=qa#top');await expect(page.getByText('Requests by country',{exact:true})).toBeVisible();
 await capture(`stats-${width}`,true);await contrast(`stats-${width}`);
 await page.getByText('Daily values and status',{exact:true}).click();await capture(`stats-table-${width}`);await contrast(`stats-table-${width}`);
}
await page.setViewportSize({width:320,height:844});const response=await page.goto(origin+'/missing-e6-page');assert.equal(response.status(),404);await capture('404-320');await contrast('404-320');
}finally{writeFileSync(prefix+'browser-acceptance.json',JSON.stringify(result,null,2));await browser.close();}
console.log('DONE',result.views.length,'captures',result.contrast.length,'contrast states',JSON.stringify(result.errors));
