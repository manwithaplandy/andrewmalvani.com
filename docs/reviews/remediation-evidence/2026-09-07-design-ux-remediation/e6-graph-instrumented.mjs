import {readFileSync,writeFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';
import ts from 'typescript';
const ws='.superpowers/sdd/2026-09-07-design-ux-remediation';
const src=readFileSync('tests/e2e/graph-discovery.spec.ts','utf8');
const start=src.indexOf('    await page.addInitScript(() => {',src.indexOf('canonical overview keeps'));
const end=src.indexOf("    await page.goto('/graph?view=3d');",start);
const init=src.slice(start,end).replace('    await page.addInitScript(', '(').trim().replace(/;$/, '');
const browser=await chromium.launch();const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
await context.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:3104'?route.continue():route.abort());
await context.addInitScript({content:ts.transpileModule(init+'()',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText});
const page=await context.newPage();let errors=[];page.on('pageerror',error=>errors.push(error.message));const results=[];
for(const [width,height] of [[1280,900],[320,844]]){
 await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:3104/graph?view=3d');
 await expect(page.locator('canvas')).toBeVisible();await page.locator('canvas').scrollIntoViewIfNeeded();
 await page.waitForTimeout(10500);await page.getByRole('button',{name:'Show overview',exact:true}).click();await page.locator('canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 const data=await page.evaluate(async()=>{window.spriteDraws=[];for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);return {draws:window.spriteDraws,paints:window.labelPaints,gradient:getComputedStyle(document.querySelector('[role="application"] div[style*="radial-gradient"]')).backgroundImage};});
 await page.locator('canvas').screenshot({path:`${ws}/evidence/e6-graph-settled-canvas-${width}.png`});
 await page.screenshot({path:`${ws}/evidence/e6-graph-settled-page-${width}.png`});
 results.push({width,height,...data});console.log('SETTLED',width,JSON.stringify(data));
 const input=page.getByRole('textbox',{name:'Find a role, skill, or achievement'});await input.fill('Georgia Tech');await page.getByRole('search',{name:'Career search'}).getByRole('button',{name:'M.S. Computer Science, Georgia Tech',exact:true}).click();await page.waitForTimeout(500);
 await page.getByRole('region',{name:'Selected career item'}).scrollIntoViewIfNeeded();await page.screenshot({path:`${ws}/evidence/e6-graph-settled-selected-${width}.png`});
}
writeFileSync(`${ws}/evidence/e6-graph-instrumented.json`,JSON.stringify({results,errors},null,2));await browser.close();
