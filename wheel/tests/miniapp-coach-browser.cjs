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
const SID="a".repeat(32);
async function run(){
 const port=await listen(),origin="http://127.0.0.1:"+port;
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const context=await browser.newContext({viewport:{width:390,height:820},deviceScaleFactor:2});
  const page=await context.newPage();
  const external=[],apiCalls=[],pageErrors=[];
  page.on("pageerror",e=>pageErrors.push(e.message));
  page.on("request",request=>{
    if(!request.url().startsWith(origin+"/"))external.push({url:request.url(),method:request.method()});
  });
  await page.route("**/miniapp-coach-config.js",route=>route.fulfill({
    status:200,contentType:"application/javascript",
    body:'window.WheelMiniAppConfig=Object.freeze({apiOrigin:"'+API+'"});'
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
      await route.fulfill({status:204,headers,body:""});return;
    }
    await route.fulfill({status:404,headers,body:"{}"});
  });
  await page.goto(origin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  assert.equal(apiCalls.length,0,"no backend call merely on visiting page");
  assert.equal(external.length,0,"no Telegram SDK loaded before explicit click");
  await page.evaluate(()=>localStorage.setItem("wheelBalanceV3Values",
    JSON.stringify([7,2,null,null,null,null,null,null,null])));
  assert.equal(await page.locator("#score").inputValue(),"","saved scores not automatically read");
  assert.equal(await page.locator("#ray").inputValue(),"","no implicit ray selection");
  await page.locator("#startBtn").click();
  assert.match(await page.locator("#status").innerText(),/выберите колесо и луч/i);
  assert.equal(apiCalls.length,0);
  await page.locator("#ray").selectOption("0");
  await page.locator("#readScoreBtn").click();
  assert.equal(await page.locator("#score").inputValue(),"7","only after explicit local read");
  await page.locator("#startBtn").click();
  assert.match(await page.locator("#status").innerText(),/подтверждение совершеннолетия/i);
  assert.equal(apiCalls.length,0);
  await page.locator("#adult").check();
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
  assert.equal(await page.evaluate(()=>localStorage.getItem("wheelBalanceV3Values")).includes("7"),true);
  await page.locator("#clearBtn").click();
  assert.equal(await page.locator("#dialog .msg").count(),0);
  assert.equal(await page.locator("#answer").inputValue(),"");

  await page.goto(origin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  assert.equal(apiCalls.length,3);
  await page.locator("#wheel").selectOption("work");
  await page.locator("#ray").selectOption("0");
  await page.locator("#readScoreBtn").click();
  assert.equal(await page.locator("#score").inputValue(),"");
  assert.deepEqual(pageErrors,[]);
  await context.close();

  const off=await browser.newPage();
  await off.goto(origin+"/wheel/miniapp-coach.html",{waitUntil:"load"});
  // The static repository config is empty: do not leak data to arbitrary network endpoints.
  // Our mocked config route was installed only on the first page, not on this page.
  await off.locator("#ray").selectOption("0");
  await off.locator("#adult").check();
  await off.locator("#consent").check();
  await off.locator("#startBtn").click();
  assert.match(await off.locator("#status").innerText(),/адрес не настроен|стенд/i);
  assert.equal(apiCalls.length,3);
  await off.close();
  console.log("PASS: Mini App opt-in, no pre-consent traffic, minimal payload, safe DOM, deletion, disabled-by-default");
 }finally{await browser.close();await close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
