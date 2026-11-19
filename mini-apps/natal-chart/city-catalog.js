/* Russian city search for PSY-TOOLS Natal Chart.
 * Uses cities-ru-data.js. Runs entirely in the user's browser, no API, no telemetry.
 * City list is a sourced snapshot, NOT a live governmental registry.
 */
(function(root,factory){
"use strict";
const data=typeof module==="object"&&module.exports?require("./cities-ru-data.js"):root.RussianCityData;
const api=factory(data);
if(typeof module==="object"&&module.exports)module.exports=api;
if(root)root.RussianCityCatalog=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(raw){
"use strict";
if(!Array.isArray(raw))throw Error("Russian city dataset unavailable");
function normalize(s){
 return String(s??"").normalize("NFKC").toLocaleLowerCase("ru")
  .replace(/ё/g,"е").replace(/[‐‑‒–—−]/g,"-")
  .replace(/[^a-zа-я0-9 -]+/g," ").replace(/\s+/g," ").trim();
}
const all=raw.map(row=>{
 const [name,region,latitude,longitude,id,utcCurrent,origin]=row;
 if(typeof name!=="string"||typeof region!=="string"||typeof id!=="string"||
 !Number.isFinite(latitude)||!Number.isFinite(longitude))throw Error("Invalid city record");
 const nameNorm=normalize(name);
 const aliases= nameNorm==="ростов великий"?["ростов"]:nameNorm==="санкт-петербург"?["петербург","спб"]:nameNorm==="нижний новгород"?["нижний"]: [];
 return Object.freeze({id,name,region,latitude,longitude,utcCurrent,origin,
  norm:nameNorm,regionNorm:normalize(region),aliases});
});
const byId=new Map(all.map(c=>[c.id,c]));
if(byId.size!==all.length)throw Error("Duplicate city IDs in reference");
const regions=Object.freeze([...new Set(all.map(c=>c.region))].sort((a,b)=>a.localeCompare(b,"ru")));
function query(text,region="",limit=25){
 const q=normalize(text), r=String(region||"").trim();
 if(r&&!regions.includes(r))throw Error("Unknown region filter");
 const max=Number.isInteger(limit)?Math.min(Math.max(limit,1),60):25;
 if(!q&&!r)return {total:0,items:[]};
 const tokens=q?q.split(" "):[];
 const matches=[];
 for(const c of all){
  if(r&&c.region!==r)continue;
  const names=[c.norm,...c.aliases];
  const full=c.norm+" "+c.regionNorm;
  const matched=!q || names.some(n=>n===q||n.startsWith(q)||n.includes(q))||
     full.includes(q) || tokens.every(t=>full.includes(t));
  if(!matched)continue;
  let score=!q?4: names.some(n=>n===q)?0:names.some(n=>n.startsWith(q))?1:
    names.some(n=>n.includes(q))?2:full.includes(q)?3:4;
  matches.push({city:c,score});
 }
 matches.sort((a,b)=>a.score-b.score||
   a.city.name.localeCompare(b.city.name,"ru")||
   a.city.region.localeCompare(b.city.region,"ru"));
 return {total:matches.length,items:matches.slice(0,max).map(x=>x.city)};
}
function get(id){return byId.get(String(id))||null;}
return Object.freeze({total:all.length,regions,normalize,query,get,source:"hflabs/city CC BY-SA 4.0 + 2023–2026 documented additions"});
});
