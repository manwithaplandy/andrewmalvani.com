import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:3102';
const evidence=new URL('./',import.meta.url);
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:320,height:844},reducedMotion:'reduce'});
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
const page=await context.newPage();
const observations=[];
async function record(name){
 await page.screenshot({path:new URL(`e6-mobile-overlap-${name}.png`,evidence).pathname});
 observations.push(await page.evaluate(label=>{
  const button=document.querySelector('button[aria-label="Open menu"]');
  const rect=button.getBoundingClientRect();
  const overlap=r=>r.width>0&&r.height>0&&r.right>rect.left&&r.left<rect.right&&r.bottom>rect.top&&r.top<rect.bottom;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const text=[];let node;
  while(node=walker.nextNode()){
   if(!node.textContent.trim()||['SCRIPT','STYLE'].includes(node.parentElement?.tagName))continue;
   const range=document.createRange();range.selectNodeContents(node);
   if([...range.getClientRects()].some(overlap))text.push(node.textContent.trim());
  }
  const fields=[...document.querySelectorAll('input,textarea,button')].filter(el=>el!==button&&overlap(el.getBoundingClientRect())).map(el=>({tag:el.tagName,id:el.id,name:el.getAttribute('aria-label'),text:el.textContent}));
  return {label,url:location.pathname+location.hash,scrollY,menuBounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},overlappingText:text,overlappingControls:fields,focused:document.activeElement?.id};
 },name));
}
await page.goto(origin);
await page.getByRole('button',{name:'Open menu',exact:true}).click();
await page.getByRole('dialog').getByRole('link',{name:'contact',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
await record('contact-anchor');
await page.getByRole('button',{name:'Send Message',exact:true}).click();
await page.locator('#contact-name').waitFor({state:'visible'});
await record('contact-invalid-focus');
await page.getByRole('button',{name:'Open menu',exact:true}).click();
await page.getByRole('dialog').getByRole('link',{name:'portfolio',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
await record('portfolio-anchor');
await page.locator('#portfolio').screenshot({path:new URL('e6-mobile-overlap-portfolio-section.png',evidence).pathname});
const output={build:'Copied static export after D1 fix4180436; no rebuild or production edit',traffic:'All non-local requests blocked; empty invalid contact form never submitted',viewport:{width:320,height:844},observations};
await fs.writeFile(new URL('e6-mobile-overlap-preflight.json',evidence),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
await browser.close();
