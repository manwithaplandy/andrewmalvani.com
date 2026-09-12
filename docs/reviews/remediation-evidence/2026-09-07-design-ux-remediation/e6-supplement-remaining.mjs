import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {chromium,expect} from '@playwright/test';
const prefix='.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/e6-';const origin='http://127.0.0.1:3104';const result=JSON.parse(readFileSync(prefix+'supplement.json'));const browser=await chromium.launch();const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844},serviceWorkers:'block'});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname==='/stats.json')return r.fulfill({json:JSON.parse(readFileSync('tests/fixtures/stats-v2-current.json'))});return r.continue();});const page=await context.newPage();
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

try {
await page.goto(origin+'/graph?view=list');
await page.locator('summary').filter({hasText:'Legend'}).click();await capture('graph-legend');await contrast('graph-legend');
await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Reduce motion',exact:true}).click();await expect(page.getByRole('button',{name:'Motion: reduced',exact:true})).toBeVisible();result.journeys.push({manualReduction:true});
await page.goto(origin+'/stats?utm_source=qa#top');await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://andrewmalvani.com/stats');
const summary=page.getByText('Daily values and status',{exact:true});if(!(await summary.evaluate(e=>e.closest('details').open)))await summary.click();await page.getByRole('table').scrollIntoViewIfNeeded();await capture('stats-table-expanded-320');await contrast('stats-table-expanded-320');
await page.getByRole('link',{name:'Back to top',exact:true}).click();result.journeys.push({backToTopY:await page.evaluate(()=>scrollY)});
await page.goto(origin+'/missing-e6-page');await page.getByRole('link',{name:'Return to the résumé',exact:true}).hover();await capture('404-hover');await contrast('404-hover');result.journeys.push({notFoundTitle:await page.title(),robots:await page.locator('meta[name=robots]').getAttribute('content')});
await page.getByRole('link',{name:'Return to the résumé',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toBeVisible();result.journeys.push({notFoundRecovery:page.url(),pdfAttribute:await page.getByRole('link',{name:'Download résumé PDF',exact:true}).getAttribute('download')});
} finally {writeFileSync(prefix+'supplement.json',JSON.stringify(result,null,2));await browser.close();}
console.log('DONE',JSON.stringify(result.journeys));
