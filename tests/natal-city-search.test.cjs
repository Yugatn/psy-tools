const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const BY=require("../mini-apps/natal-chart/city-catalog-by.js");
const RU=require("../mini-apps/natal-chart/city-catalog.js");
const rawBY=require("../mini-apps/natal-chart/cities-by-data.js");
const root=path.join(__dirname,"../mini-apps/natal-chart");

test("Belarus: complete 115-city snapshot by seven first-level areas",()=>{
 assert.equal(BY.total,115);
 assert.equal(rawBY.length,115);
 const expected={
  "Минск":1,"Минская область":24,"Витебская область":19,
  "Могилёвская область":17,"Гомельская область":18,
  "Брестская область":21,"Гродненская область":15
 };
 assert.deepEqual(Object.fromEntries(Object.keys(expected).map(r=>[r,rawBY.filter(x=>x[1]===r).length])),expected);
 assert.equal(BY.regions.length,7);
});

test("All Belarus cities are coordinate-valid and uniquely addressable",()=>{
 const ids=new Set(),positions=new Set();
 for(const [name,region,lat,lon,id,reference,code] of rawBY){
  assert.ok(name&&region&&id&&code);
  assert.equal(ids.has(id),false,"duplicate ID "+id);
  ids.add(id);
  assert.ok(Number.isFinite(lat)&&lat>=50&&lat<=57,name+" latitude");
  assert.ok(Number.isFinite(lon)&&lon>=22&&lon<=34,name+" longitude");
  assert.equal(reference,"UTC+3");
  assert.equal(BY.get(id).name,name);
  assert.equal(BY.get(id).countryCode,"BY");
  const coord=lat+"|"+lon;assert.equal(positions.has(coord),false,"duplicate position "+name);
  positions.add(coord);
 }
 assert.equal(BY.get("unknown"),null);
});

test("Belarus: major cities and regional centers are searchable",()=>{
 for(const name of ["Минск","Брест","Витебск","Гомель","Гродно","Могилёв","Борисов",
 "Солигорск","Пинск","Барановичи","Лида","Бобруйск","Орша","Полоцк","Новополоцк"]){
  const city=BY.query(name).items.find(c=>c.name===name);
  assert.ok(city,"Missing "+name);
 }
 assert.equal(BY.query("минск").items.find(c=>c.name==="Минск").region,"Минск");
});

test("Belarus: no urban-type settlements accidentally included as cities",()=>{
 const names=new Set(rawBY.map(x=>x[0].toLowerCase()));
 for(const settlement of ["Антополь","Ружаны","Городея","Дрибин","Копысь","Ивенец","Бегомль"]){
  assert.equal(names.has(settlement.toLowerCase()),false,settlement);
 }
});

test("Belarus: ё/e normalization, region filter and homonyms",()=>{
 assert.equal(BY.normalize("БЕРЁЗА"),"береза");
 assert.equal(BY.query("Береза").items.find(x=>x.name==="Берёза").region,"Брестская область");
 assert.equal(BY.query("Берёза","Гродненская область").total,0);
 assert.equal(BY.query("Могилев").items[0].name,"Могилёв");
 assert.equal(BY.query("Городок").items[0].region,"Витебская область");
 assert.throws(()=>BY.query("Минск","Несуществующая область"));
});

test("Belarus: protected correct geolocation in lookalike names",()=>{
 const names={ "Жодино":[54.0985,28.3331],"Смолевичи":[54.0249,28.0894],
 "Заславль":[54.0114,27.2695],"Берёза":[52.5314,24.9786],
 "Белыничи":[53.9994,29.7141],"Кричев":[53.7125,31.717],"Кличев":[53.4923,29.3356]};
 for(const [name,[lat,lon]] of Object.entries(names)){
  const c=BY.query(name).items.find(x=>x.name===name);
  assert.ok(c,name+" absent");
  assert.equal(c.latitude,lat);assert.equal(c.longitude,lon);
 }
});

test("Existing Russian city catalogue remains available",()=>{
 assert.equal(RU.total,1126);
 assert.ok(RU.query("Владивосток").items.some(x=>x.name==="Владивосток"));
 assert.ok(RU.query("Якутск").items.some(x=>x.name==="Якутск"));
 assert.equal(RU.query("Советск").items.filter(x=>x.name==="Советск").length,3);
});

test("Search controls keep responses mobile-sized",()=>{
 assert.equal(BY.query("").total,0);
 assert.ok(BY.query("а").items.length<=25);
 assert.equal(BY.query("","Минская область",1000).total,24);
 assert.equal(BY.query("","Минская область",1000).items.length,24);
});

test("Page loads both country catalogues and exposes selectable country",()=>{
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 assert.ok(html.includes('value="RU">Россия'));
 assert.ok(html.includes('value="BY">Беларусь'));
 assert.ok(html.includes('src="./cities-ru-data.js"'));
 assert.ok(html.includes('src="./city-catalog.js"'));
 assert.ok(html.includes('src="./cities-by-data.js"'));
 assert.ok(html.includes('src="./city-catalog-by.js"'));
 assert.ok(html.includes("currentCatalog()"));
 assert.ok(html.includes("refreshCountryRegions()"));
 assert.ok(html.includes("Историческое UTC-смещение не меняется автоматически."));
 assert.doesNotMatch(html,/fetch\s*\(\s*["']https:\/\//);
});

test("Country search UI script has valid JavaScript and unique element IDs",()=>{
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script,"inline main script missing");
 assert.doesNotThrow(()=>new Function(script[1]));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
});
