const test=require("node:test");
const assert=require("node:assert/strict");
const E=require("../mini-apps/world-clock/clock-engine.js");
const geo=require("../mini-apps/world-clock/vendor/tz-lookup.js");
const RU=require("../mini-apps/natal-chart/city-catalog.js");
const BY=require("../mini-apps/natal-chart/city-catalog-by.js");
const fs=require("node:fs");
const path=require("node:path");

test("basic default setup and 12-city limit",()=>{
 const s=E.defaultState();
 assert.equal(s.home.name,"Москва");
 assert.equal(s.extras.length,3);
 assert.equal(E.MAX_CITIES,12);
 assert.equal(new Set([s.home.id,...s.extras.map(x=>x.id)]).size,4);
 assert.equal(E.normalizeState(JSON.parse(JSON.stringify(s))).home.zone,"Europe/Moscow");
});
test("accurate snapshot across partial hour zones",()=>{
 const instant=new Date("2026-07-01T12:00:00Z");
 assert.match(E.snapshot("Europe/Moscow",instant).clock,/15:00:00/);
 assert.match(E.snapshot("Asia/Kolkata",instant).clock,/17:30:00/);
 assert.equal(E.snapshot("Asia/Kolkata",instant,"Europe/Moscow").differenceMinutes,150);
 assert.equal(E.differenceLabel(-420),"−7:00");
 assert.equal(E.differenceLabel(150),"+2:30");
 assert.equal(E.offsetLabel(-18000),"UTC−05:00");
});
test("winter/summer time comparison is date dependent",()=>{
 const summer=new Date("2026-07-01T12:00:00Z");
 const winter=new Date("2026-01-01T12:00:00Z");
 assert.equal(E.snapshot("Europe/London",summer,"Europe/Moscow").differenceMinutes,-120);
 assert.equal(E.snapshot("Europe/London",winter,"Europe/Moscow").differenceMinutes,-180);
 assert.equal(E.snapshot("America/New_York",summer,"Europe/Moscow").differenceMinutes,-420);
 assert.equal(E.snapshot("America/New_York",winter,"Europe/Moscow").differenceMinutes,-480);
});
test("planner maps one home local time to UTC and other cities",()=>{
 const r=E.resolveWallTime("2026-07-01","15:00","Europe/Moscow");
 assert.equal(r.status,"unique");
 assert.equal(r.candidates[0].iso,"2026-07-01T12:00:00.000Z");
 assert.equal(E.snapshot("Europe/London",r.candidates[0].ms).parts.hour,13);
 assert.equal(E.snapshot("America/New_York",r.candidates[0].ms).parts.hour,8);
});
test("European spring DST gap is reported without guessing",()=>{
 const result=E.resolveWallTime("2026-03-29","01:30","Europe/London");
 assert.equal(result.status,"gap");
 assert.equal(result.candidates.length,0);
});
test("European autumn DST fold yields two choices",()=>{
 const result=E.resolveWallTime("2026-10-25","01:30","Europe/London");
 assert.equal(result.status,"fold");
 assert.equal(result.candidates.length,2);
 assert.equal(result.candidates[1].ms-result.candidates[0].ms,3600000);
 assert.deepEqual(result.candidates.map(c=>c.offsetLabel),["UTC+01:00","UTC+00:00"]);
});
test("US daylight saving gap and fold",()=>{
 const gap=E.resolveWallTime("2026-03-08","02:30","America/New_York");
 assert.equal(gap.status,"gap");
 const fold=E.resolveWallTime("2026-11-01","01:30","America/New_York");
 assert.equal(fold.status,"fold");
 assert.equal(fold.candidates.length,2);
});
test("invalid IANA zone, date and time rejected",()=>{
 for(const zone of ["Europe/SomeCity","<img>","","++03","../../file"]){
  assert.throws(()=>E.validateZone(zone));
 }
 assert.throws(()=>E.resolveWallTime("2026-02-30","12:00","Europe/Moscow"));
 assert.throws(()=>E.resolveWallTime("2026-12-12","25:10","Europe/Moscow"));
 assert.throws(()=>E.resolveWallTime("2026-12-12","12:00","Invalid/Zone"));
});
test("offline coordinate lookup returns credible sample zones",()=>{
 assert.equal(geo(55.7558,37.6173),"Europe/Moscow");
 assert.equal(geo(53.9,27.5667),"Europe/Minsk");
 assert.equal(geo(40.7128,-74.0060),"America/New_York");
 assert.equal(geo(62.0355,129.6755),"Asia/Yakutsk");
});
test("shared city search catalogs preserve existing inventories",()=>{
 assert.equal(RU.total,1126);
 assert.equal(BY.total,115);
 const r=RU.query("Омск").items.find(x=>x.name==="Омск");
 assert.ok(r);
 assert.equal(typeof geo(r.latitude,r.longitude),"string");
 const b=BY.query("Минск").items[0];
 assert.equal(b.name,"Минск");
});
test("set home, add city, reorder, remove with stable IDs",()=>{
 let s=E.defaultState(),london=s.extras.find(x=>x.name==="Лондон");
 s=E.addCity(s,london,true);
 assert.equal(s.home.name,"Лондон");
 assert.ok(s.extras.some(x=>x.name==="Москва"));
 s=E.addCity(s,E.presetCities.find(x=>x.name==="Токио"));
 const t=s.extras.find(x=>x.name==="Токио");
 assert.ok(t);
 s=E.moveCity(s,t.id,-1);
 assert.equal(s.extras.at(-2).name,"Токио");
 s=E.removeCity(s,t.id);
 assert.equal(s.extras.some(x=>x.name==="Токио"),false);
 assert.throws(()=>E.removeCity(s,s.home.id));
});
test("duplicate does not create repeated city rows",()=>{
 let s=E.defaultState(),id=s.extras[0].id;
 s=E.addCity(s,s.extras[0]);
 assert.equal(s.extras.filter(x=>x.id===id).length,1);
});
test("settings JSON must match version and safe city zone",()=>{
 const a=E.defaultState();
 assert.deepEqual(E.normalizeState(JSON.parse(JSON.stringify(a))),a);
 assert.throws(()=>E.normalizeState({schema:"none",version:1,home:a.home,extras:[]}));
 assert.throws(()=>E.normalizeState({...a,home:{...a.home,zone:"NotReal/Zone"}}));
});
test("web app includes country filters, city chooser, two time modes and storage",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../mini-apps/world-clock/index.html"),"utf8");
 for(const id of ["home-clock","city-grid","country","region","search","matches","zone",
  "mode-now","mode-plan","plan-date","plan-time","plan-fold","export","import","reset"])
   assert.ok(html.includes('id="'+id+'"'),"missing "+id);
 assert.match(html,/\.\.\/natal-chart\/city-catalog.js/);
 assert.match(html,/\.\.\/natal-chart\/city-catalog-by.js/);
 assert.match(html,/vendor\/tz-lookup.js/);
 assert.match(html,/Telegram/);
 const inline=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(inline);
 assert.doesNotThrow(()=>new Function(inline[1]));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size);
});

test("geographic timezone corrections for six Russian boundary cities",()=>{
 const fixes={
  "Вяземский":"Asia/Vladivostok",
  "Горняк":"Asia/Barnaul",
  "Николаевск-на-Амуре":"Asia/Vladivostok",
  "Облучье":"Asia/Vladivostok",
  "Светогорск":"Europe/Moscow",
  "Северо-Курильск":"Asia/Sakhalin"
 };
 for(const [name,expected] of Object.entries(fixes)){
  const c=RU.query(name).items.find(x=>x.name===name);
  assert.ok(c,"Missing "+name);
  const suggested=E.suggestZone(c,"RU",geo,new Date("2026-11-19T12:00:00Z").getTime());
  assert.equal(suggested.zone,expected,"Wrong for "+name);
  assert.equal(suggested.confidence,"confirmed");
 }
});
test("Russian boundary lookup rejects mismatched UTC hint visibly",()=>{
 const c={name:"Тест",region:"Тестовая область",latitude:0,longitude:0,utcCurrent:"UTC+03:00"};
 const result=E.suggestZone(c,"RU",()=>"Asia/Tokyo");
 assert.match(result.explanation,/расходится/);
});
test("Belarus and curated places use known zones, not coordinate guesses",()=>{
 const by=BY.query("Гомель").items.find(x=>x.name==="Гомель");
 assert.equal(E.suggestZone(by,"BY",geo).zone,"Europe/Minsk");
 const tokyo=E.presetCities.find(x=>x.name==="Токио");
 assert.equal(E.suggestZone(tokyo,"WORLD",geo).zone,"Asia/Tokyo");
});
