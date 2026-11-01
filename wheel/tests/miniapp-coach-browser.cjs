"use strict";
// Test only synthetic Telegram initData and an intercepted staging backend.
// No real Telegram calls, API credentials, LLM calls or production deployments.
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost");
  let file;
  try{file=path.resolve(root,"."+decodeURIComponent(url.pathname));}
  catch(_){res.writeHead(400);res.end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{
    if(fs.statSync(file).isDirectory())file=path.join(file,"index.html");
    const ext=path.extname(file);
    res.writeHead(200,{"Content-Type":ext===".js"?"application/javascript; charset=utf-8":"text/html; charset=utf-8",
      "Cache-Control":"no-store"});
    res.end(fs.readFileSync(file));
  }catch(_){res.writeHead(404);res.end();}
});
const listen=()=>new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const close=()=>new Promise(r=>server.close(r));
const API="https://staging.example.test";
const UI="https://staging-ui.example.test";
const SID="a".repeat(32);
async function serveStatic(route,allowApi=false){
  let file;
  const pathname=new URL(route.request().url()).pathname;
  try{file=path.resolve(root,"."+decodeURIComponent(pathname));}
  catch(_){await route.fulfill({status:400,body:"Bad URL"});return;}
  if(!file.startsWith(root+path.sep)){await route.fulfill({status:403,body:"Forbidden"});return;}
  try{
    let body=fs.readFileSync(file,"utf8");
    if(allowApi && pathname.endsWith("/miniapp-coach.html"))
      body=body.replace("connect-src 'none';","connect-src "+API+";");
    await route.fulfill({status:200,
      contentType:path.extname(file)===".js"?"application/javascript":"text/html",
      body});
  }catch(_){await route.fulfill({status:404,body:"Not found"});}
}
async function run(){
 await listen();const origin=UI;
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const context=await browser.newContext({viewport:{width:390,height:820},deviceScaleFactor:2});
  const page=await context.newPage();
  const external=[],apiCalls=[],pageErrors=[];
  let failDeleteAllOnce=true;
  page.on("pageerror",e=>pageErrors.push(e.message));
  page.on("request",request=>{
    if(!request.url().startsWith(origin+"/"))external.push({url:request.url(),method:request.method()});
  });
  // A synthetic isolated HTTPS origin: no real Telegram or HTTP API is contacted.
  await page.route(origin+"/wheel/**",route=>serveStatic(route,true));
  await page.route("**/miniapp-coach-config.js",route=>route.fulfill({
    status:200,contentType:"application/javascript",
    body:'window.WheelMiniAppConfig=Object.freeze({apiOrigin:"'+API+'",uiOrigin:"'+origin+'"});'
  }));
  await page.route("https://telegram.org/js/telegram-web-app.js",route=>route.fulfill({
    status:200,contentType:"application/javascript",
    body:'window.Telegram={WebApp:{initData:"synthetic-signed-init-data",ready(){}}};'
  }));
  await page.route(API+"/api/v1/miniapp/coaching/**",async route=>{
    const req=route.request(),url=new URL(req.url());
    const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Authorization, Content-Type",
      "Access-Control-Allow-Methods":"GET, POST, DELETE", "Cache-Control":"no-store","Content-Type":"application/json"};
    if(req.method()==="OPTIONS"){
      await route.fulfill({status:204,headers,body:""});return;
    }
    apiCalls.push({method:req.method(),path:url.pathname,headers:req.headers(),
      body:req.postDataJSON?.()||null});
    if(req.method()==="POST"&&url.pathname.endsWith("/sessions")){
      await route.fulfill({status:201,headers,body:JSON.stringify({
        session_id:SID,step:0,total_steps:5,question:"Что вы наблюдаете?",
        transcript_persisted:false
      })});return;
    }
    if(req.method()==="POST"&&url.pathname.endsWith("/turns")){
      await route.fulfill({status:200,headers,body:JSON.stringify({
        finished:false,step:1,question:"Какие возможны варианты?",handoff:null,safety:null,
        transcript_persisted:false
      })});return;
    }
    if(req.method()==="DELETE"){
      if(url.pathname.endsWith("/sessions") && failDeleteAllOnce){
        failDeleteAllOnce=false;
        await route.fulfill({status:503,headers,body:"{}"});return;
      }
      await route.fulfill({status:204,headers,body:""});return;
    }
    await route.fulfill({status:404,headers,body:"{}"});
  });
  await page.goto(origin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  assert.equal(apiCalls.length,0,"no backend call merely on visiting page");
  assert.equal(external.length,0,"no Telegram SDK loaded before explicit click");
  await page.evaluate(()=>{
    localStorage.setItem("wheelBalanceV3Values",
      JSON.stringify([7,2,null,null,null,null,null,null,null]));
    localStorage.setItem("wheelNestedV2_finance_Values",JSON.stringify([1,1,1,1,1,1,1,1]));
    window.__reads=[];
    const original=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){
      window.__reads.push(key);
      return original.call(this,key);
    };
  });
  assert.equal(await page.locator("#score").inputValue(),"","saved scores not automatically read");
  assert.equal(await page.locator("#ray").inputValue(),"","no implicit ray selection");
  await page.locator("#startBtn").click();
  assert.match(await page.locator("#status").innerText(),/выберите колесо и луч/i);
  assert.equal(apiCalls.length,0);
  await page.locator("#ray").selectOption("0");
  await page.locator("#readScoreBtn").click();
  assert.equal(await page.locator("#score").inputValue(),"7","only after explicit local read");
  assert.deepEqual(await page.evaluate(()=>window.__reads),["wheelBalanceV3Values"],
    "only selected wheel storage key is accessed, not all wheels");
  await page.locator("#startBtn").click();
  assert.match(await page.locator("#status").innerText(),/подтверждение совершеннолетия/i);
  assert.equal(apiCalls.length,0);
  await page.locator("#adult").check();
  await page.locator("#consent").check();
  await page.locator("#score").selectOption("6");
  assert.equal(await page.locator("#consent").isChecked(),false,
    "consent must reset after scoring context changes");
  await page.locator("#score").selectOption("7");
  await page.locator("#consent").check();
  await page.locator("#startBtn").click();
  assert.match(await page.locator("#status").innerText(),/подключите Telegram/i);
  assert.equal(apiCalls.length,0);

  await page.locator("#connectBtn").click();
  await page.waitForFunction(()=>document.querySelector("#connection").textContent.includes("Telegram доступен"),null,{timeout:8000});
  assert.match(await page.locator("#connection").innerText(),/Telegram доступен/);
  assert.equal(apiCalls.length,0,"connect SDK alone must not send scoring data");
  assert.deepEqual(external.map(x=>x.url),["https://telegram.org/js/telegram-web-app.js"]);

  await page.locator("#startBtn").click();
  await page.waitForFunction(()=>!document.querySelector("#chatPanel").hidden,null,{timeout:8000});
  assert.equal(apiCalls.length,1);
  assert.equal(apiCalls[0].method,"POST");
  assert.equal(apiCalls[0].headers.authorization,"tma synthetic-signed-init-data");
  assert.deepEqual(apiCalls[0].body,{
    wheel_id:"main",ray_id:"r0",score:7,mode:"reflection",
    consent_for_server_processing:true,adult_attested:true,
  });
  assert.equal(apiCalls[0].headers.cookie,undefined);
  assert.equal(await page.locator("#chatPanel").isVisible(),true);
  assert.equal(await page.locator("#connectBtn").isDisabled(),true,
    "Telegram account must not switch during a live session");
  await page.locator("#answer").fill("<img src=x onerror=alert(1)>");
  await page.locator("#sendBtn").click();
  await page.waitForFunction(()=>document.querySelector("#step").textContent.includes("2 из 5"),null,{timeout:8000});
  assert.equal(apiCalls.length,2);
  assert.equal(apiCalls[1].body.expected_step,0);
  assert.equal(apiCalls[1].body.text,"<img src=x onerror=alert(1)>");
  assert.equal(await page.locator("#dialog img").count(),0,"user-controlled text must never be HTML");
  assert.match(await page.locator("#step").innerText(),/2 из 5/);
  page.once("dialog",d=>d.accept());
  await page.locator("#deleteBtn").click();
  await page.waitForFunction(()=>!document.querySelector("#finishPanel").hidden,null,{timeout:8000});
  assert.equal(apiCalls.length,3);
  assert.equal(apiCalls[2].method,"DELETE");
  assert.equal(await page.locator("#finishPanel").isVisible(),true);
  assert.equal((await page.evaluate(()=>localStorage.getItem("wheelBalanceV3Values"))).includes("7"),true);
  await page.locator("#clearBtn").click();
  assert.equal(await page.locator("#dialog .msg").count(),0);
  assert.equal(await page.locator("#answer").inputValue(),"");

  page.once("dialog",d=>d.accept());
  await page.locator("#eraseAllBtn").click();
  await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("Удаление НЕ подтверждено"),null,{timeout:8000});
  assert.equal(apiCalls.length,4,"failed delete-all must be visible, not silently acknowledged");
  assert.equal(apiCalls[3].path,"/api/v1/miniapp/coaching/sessions");
  assert.equal(await page.locator("#eraseAllBtn").isDisabled(),false);

  page.once("dialog",d=>d.accept());
  await page.locator("#eraseAllBtn").click();
  await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("удаление всех"),null,{timeout:8000});
  assert.equal(apiCalls.length,5);
  assert.equal(apiCalls[4].method,"DELETE");
  assert.equal(await page.locator("#consent").isChecked(),false);
  assert.equal((await page.evaluate(()=>localStorage.getItem("wheelBalanceV3Values"))).includes("7"),true,
    "erase-all must not touch Wheel scores");

  await page.goto(origin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  assert.equal(apiCalls.length,5);
  await page.locator("#wheel").selectOption("work");
  await page.locator("#ray").selectOption("0");
  await page.locator("#readScoreBtn").click();
  assert.equal(await page.locator("#score").inputValue(),"");
  assert.deepEqual(pageErrors,[]);
  await context.close();

  const off=await browser.newPage();
  await off.route(origin+"/wheel/**",route=>serveStatic(route,false));
  await off.goto(origin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  assert.equal(await off.locator("#connectBtn").isDisabled(),true,
    "repository's empty config must disable third-party Telegram SDK");
  // The static repository config is empty: do not leak data to arbitrary network endpoints.
  // Our mocked config route was installed only on the first page, not on this page.
  await off.locator("#ray").selectOption("0");
  await off.locator("#adult").check();
  await off.locator("#consent").check();
  await off.locator("#startBtn").click();
  assert.match(await off.locator("#status").innerText(),/адрес не настроен|стенд/i);
  assert.equal(apiCalls.length,5);
  await off.close();

  // Even if someone configures the API on the shared GitHub Pages origin,
  // the third-party SDK must never be allowed to run there.
  const shared=await browser.newPage();
  let sharedSdkRequests=0;
  shared.on("request",r=>{
    if(r.url().startsWith("https://telegram.org/js/"))sharedSdkRequests++;
  });
  const sharedOrigin="https://yugatn.github.io";
  await shared.route(sharedOrigin+"/wheel/**",route=>serveStatic(route,true));
  await shared.route("**/miniapp-coach-config.js",route=>route.fulfill({
    status:200,contentType:"application/javascript",
    body:'window.WheelMiniAppConfig=Object.freeze({apiOrigin:"'+API+'",uiOrigin:"'+sharedOrigin+'"});'
  }));
  await shared.goto(sharedOrigin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  assert.equal(await shared.locator("#connectBtn").isDisabled(),true);
  assert.match(await shared.locator("#status").innerText(),/Telegram SDK запрещён/i);
  assert.equal(sharedSdkRequests,0);
  await shared.close();
  console.log("PASS: Mini App opt-in, minimal selected-wheel read, isolated origin, consent reset, delete and erase-all failure/success");
 }finally{await browser.close();await close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
