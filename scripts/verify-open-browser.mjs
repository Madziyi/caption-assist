// Actual Open page/capture/reducer/presentation with fake media/provider. No external requests.
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2], "index.mjs")).href);
const root = process.cwd();
const entry = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import HomePage from '/src/app/page.tsx'; import '/src/app/globals.css';
class Socket {
 static OPEN=1; readyState=1; constructor(url){window.__providerUrl=url;window.__socket=this;setTimeout(()=>this.onopen?.(),0);}
 send(data){if(typeof data==='string'&&JSON.parse(data).type==='Terminate')this.onmessage?.({data:JSON.stringify({type:'Termination'})});}
 close(){this.readyState=3;this.onclose?.({});}
}
window.WebSocket=Socket;
window.__turn=(order,label,text,final=true)=>window.__socket.onmessage({data:JSON.stringify({type:'Turn',turn_order:order,speaker_label:label,transcript:text,end_of_turn:final,words:text.split(' ').map((text,i)=>({text,start:order*500+i*20,end:order*500+i*20+20,speaker:label}))})});
window.__revise=(order,label,text)=>window.__socket.onmessage({data:JSON.stringify({type:'SpeakerRevision',revisions:[{turn_order:order,speaker_label:label,words:text.split(' ').map((text,i)=>({text,start:order*500+i*20,end:order*500+i*20+20,speaker:label}))}]} )});
createRoot(document.getElementById('root')).render(React.createElement(HomePage));`;
let server,browser;
try {
 server=await createServer({root,configFile:false,define:{'process.env':'{}'},resolve:{alias:{'@':path.join(root,'src')}},plugins:[react(),{
 name:'open-browser-fixture',resolveId(id){if(id==='/open-fixture.tsx')return '\0open-fixture';},load(id){if(id==='\0open-fixture')return entry;},
 configureServer(dev){dev.middlewares.use((req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');void dev.transformIndexHtml('/', '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/open-fixture.tsx"></script>').then(html=>res.end(html)).catch(next);});}
 }],server:{host:'127.0.0.1',port:0,watch:{ignored:['**/.next/**','**/test-results/**']}}});
 await server.listen();
 browser=await chromium.launch({headless:true,executablePath:process.argv[3],args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname==='/api/transcription/session')return route.fulfill({json:{token:'synthetic-only'}});return route.continue();});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
 assert.deepEqual(await page.locator('select option').allTextContents(),['Open Mode','Headset Mode']);assert.equal(await page.getByLabel('Conversation mode').inputValue(),'open');
 await page.getByRole('button',{name:'Start Conversation',exact:true}).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>Boolean(window.__socket));
 const turn=async(...args)=>page.evaluate(args=>window.__turn(...args),args);
 await turn(0,'A','We should leave tomorrow.');await turn(1,null,'Traffic should be lighter.',false);
 await page.getByText('Traffic should be lighter.',{exact:true}).waitFor();assert.equal(await page.locator('.open-reading-block').count(),1);
 await turn(1,null,'Traffic should be lighter.');await turn(2,'A','And the weather looks better.');
 await page.waitForFunction(()=>document.querySelectorAll('.open-reading-block').length===1);
 await turn(3,'B','Yes.');await turn(4,'A','Okay.');await page.waitForFunction(()=>document.querySelectorAll('.open-reading-block').length===3);
 await page.evaluate(()=>window.__revise(3,'A','Yes.'));await page.waitForFunction(()=>document.querySelectorAll('.open-reading-block').length===1);
 await page.evaluate(()=>window.__revise(3,'B','Yes.'));await page.waitForFunction(()=>document.querySelectorAll('.open-reading-block').length===3);
 assert.equal(await page.getByText('Yes.',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Name Speaker 1',exact:true}).first().click();await page.getByRole('textbox',{name:'Name Speaker 1',exact:true}).fill('Sarah');await page.getByRole('button',{name:'Save',exact:true}).click();
 assert.equal(await page.locator('.open-reading-block').first().getByText('Sarah',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Close speakers panel'}).click();
 assert.equal(await page.locator('.open-reading-block p[aria-live="polite"][aria-atomic="false"]').count(),3);
 const layouts=[];for(const width of [390,1280]){await page.setViewportSize({width,height:844});for(const scale of [100,200]){await page.evaluate(s=>document.documentElement.style.fontSize=s+'%',scale);await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);layouts.push({width,scale,overflow:false});}}
 await page.screenshot({path:path.join(root,'test-results/open-reading.png'),fullPage:true});
 await page.getByRole('button',{name:'End Conversation',exact:true}).click();await page.getByRole('button',{name:'Start New Conversation',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({modes:true,keyboardStart:true,realFakeMediaCapture:true,immediateInterim:true,unknownBridge:true,interjection:true,revisionMergeSplit:true,rename:true,ariaLive:true,stop:true,layouts,pageErrors:0,externalNetworkAllowed:false}));
}finally{await browser?.close();await server?.close();}
