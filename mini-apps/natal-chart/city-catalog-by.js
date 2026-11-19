/* Беларусь — автономный справочник 115 городов для натальной карты.
 * Координаты исходно из srestre/world-countries-cities-db (ODbL 1.0).
 * Статус городов сверён с перечнем 115 официальных городов. UTC+3 — только подсказка.
 */
(function(root,factory){
"use strict";
const raw=typeof module==="object"&&module.exports?require("./cities-by-data.js"):root.BelarusCityData;
const api=factory(raw);
if(typeof module==="object"&&module.exports)module.exports=api;
if(root)root.BelarusCityCatalog=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(raw){
"use strict";
if(!Array.isArray(raw))throw Error("Белорусский справочник недоступен.");
const normalize=s=>String(s??"").normalize("NFKC").toLocaleLowerCase("ru")
 .replace(/ё/g,"е").replace(/[‐‑‒–—−]/g,"-")
 .replace(/[^a-zа-я0-9 -]+/g," ").replace(/\s+/g," ").trim();
const all=raw.map(item=>{
 const [name,region,latitude,longitude,id,utcCurrent,regionCode]=item;
 if(!name||!region||!id||!Number.isFinite(latitude)||!Number.isFinite(longitude)||
 latitude<50||latitude>57||longitude<22||longitude>34)throw Error("Некорректный город Беларуси.");
 const aliases=normalize(name)==="минск"?["minsk"]:normalize(name)==="могилев"?["могилёв"]:
 normalize(name)==="брест"?["brest"]:[];
 return Object.freeze({name,region,latitude,longitude,id,utcCurrent,regionCode,
  country:"Беларусь",countryCode:"BY",origin:"ODbL",norm:normalize(name),
  regionNorm:normalize(region),aliases});
});
const byId=new Map(all.map(x=>[x.id,x]));
if(byId.size!==all.length)throw Error("Повторяется идентификатор города.");
const regions=Object.freeze([...new Set(all.map(x=>x.region))].sort((a,b)=>a.localeCompare(b,"ru")));
function query(input,region="",limit=25){
 const q=normalize(input),selected=String(region||"").trim();
 if(selected&&!regions.includes(selected))throw Error("Неизвестная область Беларуси.");
 const max=Number.isInteger(limit)?Math.max(1,Math.min(limit,60)):25;
 if(!q&&!selected)return {total:0,items:[]};
 const tokens=q?q.split(" "):[];
 const matches=[];
 for(const c of all){
   if(selected&&c.region!==selected)continue;
   const names=[c.norm,...c.aliases];
   const full=c.norm+" "+c.regionNorm;
   const hit=!q||names.some(n=>n===q||n.startsWith(q)||n.includes(q))||
    full.includes(q)||tokens.every(t=>full.includes(t));
   if(!hit)continue;
   const score=!q?4:names.some(n=>n===q)?0:names.some(n=>n.startsWith(q))?1:
     names.some(n=>n.includes(q))?2:full.includes(q)?3:4;
   matches.push({city:c,score});
 }
 matches.sort((a,b)=>a.score-b.score||a.city.name.localeCompare(b.city.name,"ru")||
   a.city.region.localeCompare(b.city.region,"ru"));
 return {total:matches.length,items:matches.slice(0,max).map(x=>x.city)};
}
function get(id){return byId.get(String(id))||null;}
return Object.freeze({total:all.length,regions,normalize,query,get,
 source:"srestre/world-countries-cities-db ODbL 1.0; 115-city Belarus status reference"});
});
