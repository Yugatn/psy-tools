// Browser smoke checks: run via GitHub Actions wheel-browser.yml.
// Chromium verifies real DOM, layout, localStorage and Canvas; not a substitute for iOS Safari / Telegram WebApp.
"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const root=path.resolve(__dirname, "../..");
const routes=["", "health/", "work/", "finance/", "relationships/", "social/",
  "development/", "rest/", "creativity/", "self_awareness/", "sexuality/", "fear/",
  "destructiveness/", "detail/?parent=health&label=%D0%A1%D0%BE%D0%BD&trail=%5B%22%D0%A1%D0%BE%D0%BD%22%5D"];
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png"};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost");
  let target=path.resolve(root,"."+decodeURIComponent(url.pathname));
  if(!(target===root||target.startsWith(root+path.sep))){res.writeHead(403);res.end();return;}
  try{
    if(fs.statSync(target).isDirectory())target=path.join(target,"index.html");
    const buf=fs.readFileSync(target);
    res.writeHead(200,{"Content-Type":mime[path.extname(target)]||"application/octet-stream"});
    res.end(buf);
  }catch(_){res.writeHead(404);res.end("Not found");}
});
function listen(){return new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve(server.address().port)));}
function close(){return new Promise(resolve=>server.close(resolve));}
async function withPage(browser,options,fn){
  const context=await browser.newContext(options);
  const page=await context.newPage();
  const failures=[];page.on("pageerror",error=>failures.push(error.message));
  try{await fn(page);assert.deepEqual(failures,[],"Browser JS exceptions");}
  finally{await context.close();}
}
async function main(){
  const port=await listen(),base="http://127.0.0.1:"+port+"/wheel/";
  let browser;
  try{
    browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
    for(const route of routes){
      await withPage(browser,{viewport:{width:1280,height:900}},async page=>{
        const url=base+route;
        const res=await page.goto(url,{waitUntil:"load"});
        assert.equal(res.status(),200,route);
        await page.locator("#scoreDisplay").waitFor();
        assert.equal((await page.locator("#scoreDisplay").innerText()).trim(),"Не оценено",route+" starts unrated");
        await page.locator("#nextBtn").click();
        assert.equal((await page.locator("#scoreDisplay").innerText()).trim(),"Не оценено",route+" next keeps unrated");
      });
    }
    console.log("PASS: 14 wheel routes, initial unrated and navigation");
    await withPage(browser,{viewport:{width:1280,height:900},deviceScaleFactor:2},async page=>{
      await page.goto(base,{waitUntil:"load"});
      const slider=page.locator("#scoreSlider");
      await slider.evaluate(el=>{el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));});
      assert.equal((await page.locator("#scoreDisplay").innerText()).trim(),"0","explicit zero is rated");
      await page.locator("#nextBtn").click();
      const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("wheelBalanceV3Values")));
      assert.equal(stored[0],0);
      assert.equal(stored[1],null);
      await page.reload({waitUntil:"load"});
      assert.equal((await page.locator("#scoreDisplay").innerText()).trim(),"0","zero persists");
      for(let i=0;i<9;i++)await page.locator("#nextBtn").click();
      await page.locator("#resultSection:not(.hidden)").waitFor();
      assert.equal((await page.locator("#average").innerText()).trim(),"0.0");
      const wc=await page.locator("#wheel").evaluate(el=>({width:el.width,rect:el.getBoundingClientRect().width}));
      assert.ok(wc.width>=wc.rect,"DPR canvas is not empty");
      assert.equal(await page.locator("#resultsChart .rc-bar").count(),9);
      await page.evaluate(()=>{
        localStorage.setItem("wheelBalanceV3Improvements",
          JSON.stringify({0:{target:6,note:"<img src=x onerror=alert(1)>",step:"Ежедневная прогулка",date:"2026-12-31"}}));
        localStorage.setItem("wheelBalanceV3Values:history",JSON.stringify([
          {date:"2026-10-01",values:[0,null,null,null,null,null,null,null,null]},
          {date:"2026-10-15",values:[2,null,null,null,null,null,null,null,null]}
        ]));
        const k="wheelBalanceDetail:"+encodeURIComponent("health:Режим сна")+":values";
        localStorage.setItem(k,JSON.stringify([5,null,null,null,null,null,null,null]));
      });
      await page.goto(base+"cabinet.html",{waitUntil:"load"});
      assert.match(await page.locator("#goalsList").innerText(),/Ежедневная прогулка/);
      assert.match(await page.locator("#trendsList").innerText(),/сопоставлено лучей: 1/);
      assert.equal(await page.locator("#goalsList img").count(),0,"user note HTML is escaped");
      const link=await page.locator('a[href*="detail/?"]').first().getAttribute("href");
      assert.ok(link && link.includes("trail="),"detail link retains trail");
      const original=await page.evaluate(()=>localStorage.getItem("wheelBalanceV3Values"));
      await page.locator("#importFile").setInputFiles({
        name:"unsafe.json",mimeType:"application/json",
        buffer:Buffer.from(JSON.stringify({source:"wheel-cabinet",version:1,
          data:{wheelBalanceV3Values:[null,11]}}))
      });
      assert.match(await page.locator("#dataFeedback").innerText(),/Ошибка импорта/);
      assert.equal(await page.evaluate(()=>localStorage.getItem("wheelBalanceV3Values")),original);
    });
    console.log("PASS: zero score, persistence, DPR Canvas, cabinet goals/trends/XSS, deep link, import guard");
    for(const width of [390,768]){
      await withPage(browser,{viewport:{width,height:844},deviceScaleFactor:3,hasTouch:true},async page=>{
        await page.goto(base,{waitUntil:"load"});
        assert.equal((await page.locator("#scoreDisplay").innerText()).trim(),"Не оценено");
        const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+5);
        assert.equal(hasOverflow,false,"horizontal overflow at width "+width);
      });
    }
    console.log("PASS: Chromium responsive width checks (390, 768)");
    // Separate browser contexts emulate independent browser profiles/users on one origin.
    const profileA = await browser.newContext();
    const profileB = await browser.newContext();
    try {
      const pageA = await profileA.newPage();
      const pageB = await profileB.newPage();
      await pageA.goto(base,{waitUntil:"load"});
      const personal = [7, null, null, null, null, null, null, null, null];
      await pageA.evaluate(scores=>localStorage.setItem("wheelBalanceV3Values",
        JSON.stringify(scores)),personal);
      const secondTabA = await profileA.newPage();
      await secondTabA.goto(base,{waitUntil:"load"});
      assert.equal((await secondTabA.locator("#scoreDisplay").innerText()).trim(),"7",
        "SAME browser profile: next user can see previous scores; this is a documented privacy risk");
      await pageB.goto(base,{waitUntil:"load"});
      assert.equal((await pageB.locator("#scoreDisplay").innerText()).trim(),"Не оценено",
        "independent browser profile has no profile A scores");
      assert.equal(await pageB.evaluate(()=>localStorage.getItem("wheelBalanceV3Values")),null);
      const warning=await pageA.locator(".privacy-warning").innerText();
      assert.match(warning,/общем устройстве/);
      assert.match(await secondTabA.locator(".privacy-warning").innerText(),/профиля браузера/);
      await pageA.goto(base+"cabinet.html",{waitUntil:"load"});
      assert.match(await pageA.locator(".privacy-notice").innerText(),/Следующий человек/);
      pageA.once("dialog",dialog=>dialog.accept());
      await pageA.locator("#clearBtn").click();
      assert.equal(await pageA.evaluate(()=>localStorage.getItem("wheelBalanceV3Values")),null,
        "clear removes stored result from shared profile");
      await secondTabA.reload({waitUntil:"load"});
      assert.equal((await secondTabA.locator("#scoreDisplay").innerText()).trim(),"Не оценено",
        "later user no longer sees the score after explicit clear");
    } finally {
      await profileA.close();
      await profileB.close();
    }
    console.log("PASS: profile A/B storage isolation, same-profile sharing confirmed as known privacy risk");
  }finally{if(browser)await browser.close();await close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
