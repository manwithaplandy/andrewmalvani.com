import {chromium} from '../../../node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/serve/build/main.js','out','--listen','tcp://127.0.0.1:3105'],{stdio:'ignore'});
let browser;
try {
 for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:3105')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch(); const page=await browser.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:3105'&&r.request().method()==='GET'?r.continue():r.abort());
 await page.addInitScript(()=>{window.historyWrites=[];for(const method of ['pushState','replaceState']){const original=history[method].bind(history);history[method]=function(state,title,url){window.historyWrites.push({method,state,url,at:performance.now()});return original(state,title,url);};}});
 await page.goto('http://127.0.0.1:3105/graph?view=list');
 await page.getByRole('navigation',{name:'Career graph, list view'}).waitFor();
 console.log('INITIAL',JSON.stringify(await page.evaluate(()=>({url:location.href,writes:window.historyWrites}))));
 await page.getByRole('navigation',{name:'Career graph, list view'}).getByRole('button',{name:'Python',exact:true}).click();
 await page.waitForTimeout(300);
 console.log('SELECTED',JSON.stringify(await page.evaluate(()=>({url:location.href,writes:window.historyWrites}))));
 await page.getByRole('link',{name:'Classic resume',exact:true}).click();
 await page.locator('#contact').waitFor();
 await page.goBack();
 await page.getByRole('navigation',{name:'Career graph, list view'}).waitFor();
 await page.goBack();
 await page.waitForTimeout(300);
 console.log('BACK',JSON.stringify(await page.evaluate(()=>({url:location.href,writes:window.historyWrites}))));
}finally{await browser?.close();server.kill('SIGTERM');}
