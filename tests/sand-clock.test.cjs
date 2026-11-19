const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const E=require("../mini-apps/sand-clock/timer-engine.js");

test("defaults and presets cover short and long countdowns",()=>{
 const state=E.create();
 assert.equal(state.status,"idle");
 assert.equal(state.durationMs,300000);
 assert.equal(E.MAX_MS,86400000);
 assert.ok(E.PRESETS.some(x=>x.ms===30000));
 assert.ok(E.PRESETS.some(x=>x.ms===5400000));
 assert.equal(E.fromFields("0","5","0"),300000);
 assert.equal(E.fromFields("1","30","20"),5420000);
 assert.deepEqual(E.toFields(5420000),{hours:1,minutes:30,seconds:20});
});
test("invalid durations and fields are rejected",()=>{
 for(const ms of [0,999,-1000,86400001,1.5,NaN,Infinity])assert.throws(()=>E.create(ms));
 for(const x of [["0","0","0"],["0","59","60"],["25","0","0"],["24","0","1"],["x","1","1"],["1.5","0","0"],["1","","1"]])
  assert.throws(()=>E.fromFields(...x),x.join(":"));
 assert.equal(E.fromFields("24","0","0"),E.MAX_MS);
});
test("deadline, not animation frame rate, determines elapsed duration",()=>{
 const start=E.start(E.create(60000),100000);
 assert.equal(start.deadlineMs,160000);
 assert.equal(E.snapshot(start,100000).remainingMs,60000);
 assert.equal(E.snapshot(start,115234).remainingMs,44766);
 assert.equal(E.snapshot(start,130000).progress,.5);
 assert.equal(E.snapshot(start,160000).status,"completed");
 assert.equal(E.snapshot(start,161000).remainingMs,0);
});
test("tapered sand levels produce volume exactly proportional to time",()=>{
 const state=E.start(E.create(20000),100);
 for(const elapsed of [0,20,1000,5000,7000,10000,15000,19999,20000]){
  const p=E.snapshot(state,100+elapsed);
  const top=p.topSandHeight,bottom=p.bottomSandHeight;
  const upperVolume=(16*top+80*top*top)/96;
  const lowerVolume=(176*bottom-80*bottom*bottom)/96;
  assert.ok(Math.abs(upperVolume-(1-p.progress))<1e-11,"upper volume "+elapsed);
  assert.ok(Math.abs(lowerVolume-p.progress)<1e-11,"lower volume "+elapsed);
  assert.ok(Math.abs(upperVolume+lowerVolume-1)<1e-11,"total volume "+elapsed);
 }
});
test("pause stops both timer and falling sand; resume uses remainder",()=>{
 let s=E.start(E.create(30000),10000);
 s=E.pause(s,18000);
 assert.equal(s.status,"paused");
 assert.equal(s.remainingMs,22000);
 assert.ok(Math.abs(E.snapshot(s,100000).progress-8000/30000)<1e-12);
 assert.equal(E.snapshot(s,100000).flowing,false);
 s=E.start(s,100000);
 assert.equal(E.snapshot(s,111000).remainingMs,11000);
 assert.equal(E.snapshot(s,122000).status,"completed");
});
test("start is idempotent while running",()=>{
 const first=E.start(E.create(15000),5000);
 const second=E.start(first,15000);
 assert.deepEqual(first,second);
});
test("reset stops running timer and restarts the sand from full chamber",()=>{
 const s=E.start(E.create(90000),0);
 const reset=E.reset(s);
 assert.equal(reset.status,"idle");
 assert.equal(reset.deadlineMs,null);
 assert.equal(E.snapshot(reset,250000).topSandHeight,1);
 assert.equal(E.snapshot(reset,250000).bottomSandHeight,0);
 assert.equal(E.snapshot(reset,250000).flowing,false);
});
test("replacement requires stop and never silently modifies a running countdown",()=>{
 const running=E.start(E.create(5000),10);
 assert.throws(()=>E.replaceDuration(running,10000));
 const paused=E.pause(running,2000);
 const replaced=E.replaceDuration(paused,10000);
 assert.equal(replaced.status,"idle");
 assert.equal(replaced.remainingMs,10000);
});
test("reload after deadline correctly reports completion",()=>{
 const running=E.start(E.create(3000),10000);
 const reloaded=E.restore(JSON.stringify(running),17000);
 assert.equal(reloaded.status,"completed");
 assert.equal(reloaded.remainingMs,0);
 assert.equal(reloaded.deadlineMs,null);
});
test("reload during countdown recovers remaining fraction",()=>{
 const running=E.start(E.create(30000),10000);
 const reloaded=E.restore(JSON.stringify(running),18000);
 assert.equal(reloaded.status,"running");
 assert.equal(E.snapshot(reloaded,18000).remainingMs,22000);
});
test("paused state survives reload without time passing",()=>{
 const paused=E.pause(E.start(E.create(30000),10000),18000);
 const reloaded=E.restore(JSON.stringify(paused),100000);
 assert.equal(reloaded.status,"paused");
 assert.equal(reloaded.remainingMs,22000);
});
test("corrupted saved data is rejected",()=>{
 for(const x of [null,{},{"schema":"none","version":1},E.create(1000)]){
  if(x&&x.schema==="psy-tools-sand-timer")continue;
  assert.throws(()=>E.restore(x,1000));
 }
 assert.throws(()=>E.restore({...E.create(1000),status:"running",deadlineMs:null},1000));
 assert.throws(()=>E.restore({...E.create(1000),status:"paused",remainingMs:-1},1000));
});
test("countdown display is rounded up so it never shows zero early",()=>{
 assert.equal(E.formatMs(300000),"05:00");
 assert.equal(E.formatMs(299999),"05:00");
 assert.equal(E.formatMs(1000),"00:01");
 assert.equal(E.formatMs(1),"00:01");
 assert.equal(E.formatMs(0),"00:00");
 assert.equal(E.formatMs(3660999),"01:01:01");
});
test("HTML has interactive controls, sand shapes and local recovery",()=>{
 const h=fs.readFileSync(path.join(__dirname,"../mini-apps/sand-clock/index.html"),"utf8");
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const id of ["hourglass","upper-sand","lower-sand","flow","sand-stream","display",
 "start","pause","reset","hours","minutes","seconds","presets","sound","vibrate","progress-track"]){
  assert.ok(ids.includes(id),"Missing "+id);
 }
 assert.match(h,/requestAnimationFrame\(frame\)/);
 assert.match(h,/Date\.now\(\)/);
 assert.match(h,/E\.snapshot\(timer,now\)/);
 assert.match(h,/localStorage\.setItem/);
 assert.match(h,/visibilitychange/);
 assert.match(h,/aria-label/);
 assert.doesNotMatch(h,/fetch\(/);
 const s=h.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(s);
 assert.doesNotThrow(()=>new Function(s[1]));
});
