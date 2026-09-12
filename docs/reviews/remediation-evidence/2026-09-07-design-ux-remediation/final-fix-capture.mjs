import {chromium} from '../../../node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const evidence='.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/';
const server=spawn(process.execPath,['node_modules/serve/build/main.js','out','--listen','tcp://127.0.0.1:3105'],{stdio:'ignore'});
let browser;
try {
 for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:3105')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1280,height:1000}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:3105'&&r.request().method()==='GET'?r.continue():r.abort());
 const list=page.getByRole('navigation',{name:'Career graph, list view'});
 const python=list.getByRole('button',{name:'Python',exact:true});
 const observations=[];
 const record=async label=>observations.push({label,...await page.evaluate(()=>({path:location.pathname+location.search+location.hash,graph:!!document.querySelector('[aria-label="Career graph, list view"], [role="application"]'),contact:!!document.querySelector('#contact'),routerOwned:history.state?.__N===true,sameDocument:document.documentElement.dataset.historyCapture==='original'}))});
 await page.goto('http://127.0.0.1:3105/graph?view=3d#node=skill%3Apython');
 await page.locator('canvas').waitFor();
 await page.evaluate(()=>document.documentElement.dataset.historyCapture='original');
 await page.getByRole('button',{name:'Text view',exact:true}).click();
 await python.waitFor();
 assert.equal(await python.getAttribute('aria-expanded'),'true');
 await record('list entry');
 await page.getByRole('link',{name:'Classic resume',exact:true}).click();
 await page.locator('#contact').waitFor(); await record('classic resume');
 await page.goBack(); await python.waitFor();
 assert.equal(await python.getAttribute('aria-expanded'),'true');
 await record('Back restores list/Python');
 await python.scrollIntoViewIfNeeded();
 await page.screenshot({path:evidence+'final-fix-back-list-python.png'});
 await page.goBack(); await page.locator('canvas').waitFor();
 await page.getByRole('heading',{name:'Python',exact:true}).waitFor();
 await page.waitForTimeout(10500); // Actual progressing clock; settle library camera animation.
 await record('Back restores 3D/Python');
 await page.screenshot({path:evidence+'final-fix-back-3d-python.png',fullPage:true});
 await page.goForward(); await python.waitFor(); await record('Forward restores list/Python');
 await page.goForward(); await page.locator('#contact').waitFor(); await record('Forward restores classic resume');
 assert.deepEqual(observations.map(o=>[o.path,o.graph,o.contact,o.sameDocument]),[
 ['/graph?view=list#node=skill%3Apython',true,false,true],['/',false,true,true],
 ['/graph?view=list#node=skill%3Apython',true,false,true],['/graph?view=3d#node=skill%3Apython',true,false,true],
 ['/graph?view=list#node=skill%3Apython',true,false,true],['/',false,true,true]]);
 assert.deepEqual(errors,[]);
 writeFileSync(evidence+'final-fix-history-capture.json',JSON.stringify({observations,errors,clock:'real progressing time; no Date override'},null,2)+'\n');
 console.log(JSON.stringify({steps:observations.length,errors,allPageModeSelectionAndDocumentAssertions:'pass'}));
}finally{await browser?.close();server.kill('SIGTERM');}
