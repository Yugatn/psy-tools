/** PSY-TOOLS habit / dependency frequency regression suite.
 * Run from repo root: node wheel/dependencies/tests/smoke.cjs
 * Simulated browser DOM, localStorage and file input. Does not replace real-browser tests.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const catalog=fs.readFileSync(path.join(__dirname,"..","catalog.js"),"utf8");
const js=html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script defer src="\.\.\/wheel-nav\.js"/)?.[1];
assert.ok(js,"Controller found");
function start(initial){
  const store=new Map(initial===undefined?[]:[["psyToolsHabitFrequencyV1",JSON.stringify(initial)]]),nodes=new Map(),events={};
  let document;
  class E{
    constructor(tag){this.tag=tag;this.nodes=[];this.events={};this.attributes={};this.style={};this.value="";this._text="";this.className="";this.disabled=false;this.hidden=false}
    get textContent(){return this._text}set textContent(x){this._text=String(x)}
    get children(){return this.nodes.filter(x=>x.tag!=="#text")}
    append(...children){this.nodes.push(...children)}
    prepend(...children){this.nodes.unshift(...children)}
    appendChild(child){this.nodes.push(child);return child}
    replaceChildren(...children){this.nodes=[...children]}
    addEventListener(k,fn){(this.events[k]||=[]).push(fn)}
    async emit(k,extra={}){for(const fn of this.events[k]||[])await fn({target:this,preventDefault(){},...extra})}
    click(){return this.emit("click")}
    setAttribute(k,v){this.attributes[k]=String(v)}
    scrollIntoView(){}focus(){document.activeElement=this}remove(){}
  }
  document={getElementById(id){if(!nodes.has(id))nodes.set(id,new E("div"));return nodes.get(id)},
    createElement:tag=>new E(tag),createElementNS:(_namespace,tag)=>new E(tag),body:new E("body")};
  const window={addEventListener:(k,fn)=>events[k]=fn,print(){}};
  new Function("window",catalog)(window);
  const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  new Function("document","window","localStorage","confirm","URL","Blob","setTimeout",js)(
    document,window,localStorage,()=>true,{createObjectURL:()=>"blob:test",revokeObjectURL(){}},Blob,fn=>fn()
  );
  const get=id=>document.getElementById(id),saved=()=>JSON.parse(store.get("psyToolsHabitFrequencyV1")||"null");
  return {get,saved,store,events,catalog:window.PSY_DEPENDENCY_DATA};
}
(async()=>{
  let checks=0;function ok(value,message){assert.ok(value,message);checks++}
  const a=start(),get=a.get;
  ok(a.catalog.items.length===35,"35 activity choices");
  ok(a.catalog.frequency.length===13,"13 frequency and status responses");
  ok(new Set(a.catalog.frequency.map(x=>x.value)).size===13,"unique frequency values");
  ok(a.catalog.frequency[0].label==="Несколько раз в день","first response multiple per day");
  ok(a.catalog.frequency.some(x=>x.value==="abstinent_3y"&&x.level===0),"3+ year abstinence represented, not dependence level");
  ok(a.catalog.frequency.some(x=>x.value==="never"&&x.level===0),"no lifetime experience represented");
  ok(a.catalog.frequency.some(x=>x.value==="decline"&&x.level===null),"privacy refusal is not zero");
  ok(get("items").children.length===11,"11 default rays");
  ok(get("scale").children.length===13,"all options visibly explained");
  ok(get("count").textContent==="0 / 11","unrated does not equal no experience");
  let card=get("items").children[0],select=card.children[3];
  ok(select.children.length===14,"13 choices plus unanswered");
  select.value="never";await select.emit("change");
  ok(a.saved().version===2,"new schema v2");
  ok(a.saved().records.sweet.frequency==="never","never experienced is distinct value");
  ok(get("count").textContent==="1 / 11","never counts as answered");
  ok(get("daily").textContent==="0","never does not count as daily");
  select.value="abstinent_3y";await select.emit("change");
  ok(a.saved().records.sweet.frequency==="abstinent_3y","3+ year abstinence captured");
  select.value="decline";await select.emit("change");
  ok(get("count").textContent==="0 / 11","declined answer does not imply exposure");
  ok(get("legend").children[0].textContent.includes("Не хочу отвечать"),"decline shown without guessing exposure");
  select.value="many_daily";await select.emit("change");
  ok(get("daily").textContent==="1","several times daily classified daily+");
  ok(get("count").textContent==="1 / 11","frequency counted when answered");
  const marker=card.children[5].children[0].children[1];marker.value="yes";await marker.emit("change");
  ok(get("flags").textContent==="1","control concern recorded separately");
  card.children[7].value="Без идентифицирующих сведений";await card.children[7].emit("input");
  ok(a.saved().records.sweet.note==="Без идентифицирующих сведений","note persists");
  get("search").value="энергетические";await get("search").emit("input");
  ok(get("catalog").children.length===1,"catalog search");
  await get("catalog").children[0].children[1].emit("click");
  ok(a.saved().selected.includes("energy"),"catalog selection");
  get("search").value="";await get("search").emit("input");
  get("customName").value="Собственное занятие";await get("addCustom").emit("click");
  ok(a.saved().selected.length===13,"custom ray add");
  await get("snapshot").emit("click");
  ok(a.saved().history.length===1,"new snapshot saved");
  ok(a.saved().history[0].records.sweet.frequency==="many_daily","snapshot preserves descriptive frequency");
  card=get("items").children[0];select=card.children[3];select.value="weekly";await select.emit("change");
  await get("history").children[0].children[1].emit("click");
  ok(a.saved().records.sweet.frequency==="many_daily","history restores frequency");
  ok(a.saved().version===2,"history restore retains v2 schema");
  const backup=a.saved(),reopen=start(backup);
  ok(reopen.get("daily").textContent==="1","reload restores recent choice");
  ok(reopen.saved().records.sweet.markers.control==="yes","reload restores independent control marker");
  const uploader=get("importFile"),string=JSON.stringify(backup);
  uploader.files=[{size:string.length,text:async()=>string}];await uploader.emit("change");
  ok(a.saved().history.length===1,"JSON import preserves v2 history");
  const before=JSON.stringify(a.saved());
  uploader.files=[{size:10,text:async()=>"{broken"}];await uploader.emit("change");
  ok(JSON.stringify(a.saved())===before,"invalid JSON rejected without data loss");
  const old={version:1,selected:["sweet","music"],custom:{},records:{sweet:{frequency:6,markers:{control:"yes"},note:"Старая заметка"},music:{frequency:0}},history:[{date:"2026-10-22T11:00:00.000Z",selected:["sweet","music"],custom:{},records:{sweet:{frequency:5},music:{frequency:1}}}]};
  const migrated=start(old);
  ok(migrated.get("count").textContent==="0 / 2","legacy score not converted to false new frequency");
  ok(migrated.get("items").children[0].children[4].textContent.includes("30 дней"),"legacy rating visible in card");
  ok(migrated.get("history").children.length===1,"old snapshot archived read-only");
  ok(migrated.get("history").children[0].textContent.includes(""),"archive is representable");
  const oldSelected=migrated.get("items").children[0].children[3];oldSelected.value="weekly";await oldSelected.emit("change");
  ok(migrated.saved().version===2,"old schema migrates on first write");
  ok(migrated.saved().records.sweet.frequency==="weekly","new choice recorded");
  ok(migrated.saved().records.sweet.legacy30days===6,"old 30-day value retained in archive field");
  ok(migrated.saved().records.sweet.note==="Старая заметка","old notes preserved");
  ok(migrated.saved().archived30day.length===1,"old dated snapshots preserved without conversion");
  const rehydrated=start(migrated.saved());
  ok(rehydrated.saved().archived30day.length===1,"legacy archive survives reload");
  const malformed=start({version:2,selected:["sweet","not-real"],custom:{},records:{sweet:{frequency:"unrecognized",markers:{control:"yes"}}},history:[],archived30day:[]});
  ok(malformed.get("count").textContent==="0 / 1","invalid frequency rejected");
  ok(malformed.get("flags").textContent==="1","independent marker preserved");
  await get("clearCurrent").emit("click");
  ok(get("count").textContent==="0 / 13","clear current retains selected rays");
  ok(a.saved().history.length===1,"clear current preserves history");
  const snapshot=JSON.stringify(a.saved());a.events.storage({key:"psyToolsHabitFrequencyV1"});
  card=get("items").children[0];select=card.children[3];select.value="daily";await select.emit("change");
  ok(JSON.stringify(a.saved())===snapshot,"stale tab cannot overwrite saved data");
  ok(get("status").textContent.includes("Перезагрузите"),"stale warning visible");
  const deleted=start(backup);await deleted.get("clearAll").emit("click");
  ok(!deleted.store.has("psyToolsHabitFrequencyV1"),"delete all clears local data");
  console.log("PASS: "+checks+" nuanced habit-frequency checks");
})().catch(error=>{console.error(error);process.exitCode=1});
