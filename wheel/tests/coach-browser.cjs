"use strict";
// Browser smoke: no external requests, no auto-storage, explicit consent, separate profiles.
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost");
  let dest;
  try{dest=path.resolve(root,"."+decodeURIComponent(url.pathname));}
  catch(_){res.writeHead(400);res.end();return;}
  if(!dest.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{
    if(fs.statSync(dest).isDirectory())dest=path.join(dest,"index.html");
    const data=fs.readFileSync(dest);
    res.writeHead(200,{"Content-Type":dest.endsWith(".js")?"application/javascript; charset=utf-8":"text/html; charset=utf-8"});
    res.end(data);
  }catch(_){res.writeHead(404);res.end("Not found");}
});
const listen=()=>new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve(server.address().port)));
const close=()=>new Promise(resolve=>server.close(resolve));
async function main(){
 const port=await listen(),origin="http://127.0.0.1:"+port,base=origin+"/wheel/";
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const a=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:2});
  const b=await browser.newContext({viewport:{width:390,height:800},deviceScaleFactor:3,hasTouch:true});
  try{
    const pa=await a.newPage(),pb=await b.newPage();
    const requests=[],jsErrors=[];
    pa.on("request",r=>requests.push(r.url()));
    pa.on("pageerror",e=>jsErrors.push(e.message));
    await pa.goto(base+"coach.html#main",{waitUntil:"load"});
    assert.equal(await pa.locator("#wheelSelect option").count(),1,"must not scan other scores before consent");
    await pa.locator("#loadBtn").click();
    assert.match(await pa.locator("#status").innerText(),/не найдено/);
    await pa.evaluate(()=>{
      localStorage.setItem("wheelBalanceV3Values",JSON.stringify([0,null,3,null,null,null,null,null,null]));
      localStorage.setItem("unrelatedData","sentinel");
    });
    await pa.locator("#loadBtn").click();
    assert.equal(await pa.locator("#wheelSelect option").count(),2);
    assert.equal(await pa.locator("#wheelSelect").inputValue(),"0","hash preselects matching wheel only");
    assert.match(await pa.locator("#raySelect option").nth(1).innerText(),/0 из 10/);
    assert.match(await pa.locator("#raySelect option").nth(2).innerText(),/нет оценки/);
    await pa.locator("#raySelect").selectOption("0");
    await pa.locator("#startBtn").click();
    assert.match(await pa.locator("#status").innerText(),/подтвердить добровольное/);
    await pa.locator("#consent").check();
    await pa.locator("#mode").selectOption("reframe");
    await pa.locator("#startBtn").click();
    assert.equal(await pa.locator("#dialogue").isVisible(),true);
    assert.match(await pa.locator("#stepInfo").innerText(),/1 из 5/);
    await pa.locator("#answer").fill("<img src=x onerror=alert(1)>");
    await pa.locator("#sendBtn").click();
    assert.equal(await pa.locator("#conversation img").count(),0,"user text must not turn into markup");
    for(let i=0;i<4;i++)await pa.locator("#skipBtn").click();
    assert.equal(await pa.locator("#completePanel").isVisible(),true);
    const summary=await pa.locator("#summary").inputValue();
    assert.match(summary,/<img src=x onerror=alert\(1\)>/);
    assert.equal(await pa.evaluate(()=>localStorage.getItem("wheelBalanceV3Improvements")),null,
      "finishing must not save raw chat");
    assert.equal(await pa.evaluate(()=>localStorage.getItem("unrelatedData")),"sentinel");
    pa.once("dialog",d=>d.accept());
    await pa.locator("#saveBtn").click();
    const result=await pa.evaluate(()=>JSON.parse(localStorage.getItem("wheelBalanceV3Improvements")));
    assert.match(result[0].note,/Мой/); // actual note holds user's text and structured questions
    assert.equal(result[0].target,undefined,"should not invent goals");
    const secondA=await a.newPage();
    await secondA.goto(base+"coach.html",{waitUntil:"load"});
    await secondA.locator("#loadBtn").click();
    assert.equal(await secondA.locator("#wheelSelect option").count(),2,
      "same browser profile sees the same local results (documented warning)");
    await pb.goto(base+"coach.html",{waitUntil:"load"});
    await pb.locator("#loadBtn").click();
    assert.equal(await pb.locator("#wheelSelect option").count(),1,
      "independent browser profile must not receive first user's scores");
    assert.equal(await pb.evaluate(()=>localStorage.getItem("wheelBalanceV3Values")),null);
    assert.deepEqual(jsErrors,[],"no browser JavaScript exceptions");
    assert.equal(requests.some(url=>!url.startsWith(origin+"/")),false,
      "coach must not request external services");
    await pa.reload({waitUntil:"load"});
    assert.equal(await pa.locator("#summary").inputValue(),"","unpersisted chat clears on navigation");
    assert.equal(await pa.locator("#conversation .message").count(),0);
    console.log("PASS: user consent, no automatic transmission/storage, safe text, explicit save, independent browser contexts");
  }finally{await a.close();await b.close();}
  for(const file of ["wheel/index.html","wheel/health/index.html","wheel/work/index.html",
   "wheel/finance/index.html","wheel/relationships/index.html","wheel/social/index.html",
   "wheel/development/index.html","wheel/rest/index.html","wheel/creativity/index.html",
   "wheel/self_awareness/index.html","wheel/sexuality/index.html",
   "wheel/fear/index.html","wheel/destructiveness/index.html","wheel/detail/index.html"]){
    const html=fs.readFileSync(path.resolve(root,file),"utf8");
    assert.match(html,/class="card wheel-coach-entry"/,file+" entry");
  }
  console.log("PASS: all 14 wheel results pages offer offline coach");
 }finally{if(browser)await browser.close();await close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
