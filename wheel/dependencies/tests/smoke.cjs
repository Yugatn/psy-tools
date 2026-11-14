/** Run: node wheel/dependencies/tests/smoke.cjs (Node 18+).
 * Regression tests with simulated DOM, storage and file input.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8"),catalog=fs.readFileSync(path.join(__dirname,"..","catalog.js"),"utf8");
const js=html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script defer src="\.\.\/wheel-nav\.js"/)?.[1];assert.ok(js,"controller found");
function launch(seed){
  const store=new Map(seed===undefined?[]:[["psyToolsHabitFrequencyV1",JSON.stringify(seed)]]),nodes=new Map(),events={};let doc;
  class El{
    constructor(tag){this.tag=tag;this.nodes=[];this.events={};this.attrs={};this.style={};this.value="";this._text="";this.className="";this.disabled=false}
    set textContent(x){this._text=String(x)}get textContent(){return this._text}
    get children(){return this.nodes.filter(x=>x.tag!=="#text")}
    append(...x){this.nodes.push(...x)}prepend(...x){this.nodes.unshift(...x)}appendChild(x){this.nodes.push(x);return x}replaceChildren(...x){this.nodes=[...x]}
    addEventListener(k,fn){(this.events[k]||=[]).push(fn)}
    async emit(k){for(const fn of this.events[k]||[])await fn({target:this,preventDefault(){}})}
    setAttribute(k,v){this.attrs[k]=String(v)}
    click(){return this.emit("click")}scrollIntoView(){}focus(){doc.activeElement=this}remove(){}
  }
  doc={getElementById(id){if(!nodes.has(id))nodes.set(id,new El("div"));return nodes.get(id)},
    createElement:tag=>new El(tag),createElementNS:(_ns,tag)=>new El(tag),body:new El("body")};
  const win={addEventListener:(k,fn)=>events[k]=fn,print(){}};
  new Function("window",catalog)(win);
  const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  new Function("document","window","localStorage","confirm","URL","Blob","setTimeout",js)(doc,win,storage,()=>true,{createObjectURL:()=>"blob:mock",revokeObjectURL(){}},Blob,fn=>fn());
  const get=id=>doc.getElementById(id),saved=()=>JSON.parse(store.get("psyToolsHabitFrequencyV1")||"null");
  return {get,saved,store,events,data:win.PSY_DEPENDENCY_DATA};
}
(async()=>{
let n=0;const ok=(x,label)=>{assert.ok(x,label);n++};
const a=launch(),get=a.get;
ok(a.data.items.length===35,"35 catalog areas");
ok(new Set(a.data.items.map(x=>x.id)).size===35,"unique catalog ids");
ok(a.data.defaults.length===11,"11 default selected areas");
ok(a.data.frequency.length===7,"seven frequency levels");
ok(a.data.frequency[0].days==="0 дней"&&a.data.frequency[6].days==="30 дней","anchored 30-day endpoints");
ok(get("items").children.length===11,"11 cards on initial wheel");
ok(get("count").textContent==="0 / 11","initial assessments empty");
ok(get("daily").textContent==="0","initial daily count zero");
ok(get("chart").children.length>10,"SVG created");
let card=get("items").children[0],frequency=card.children[3];frequency.value="0";await frequency.emit("change");
ok(a.saved().records.sweet.frequency===0,"zero score persists");
ok(get("count").textContent==="1 / 11","zero counted as assessed");
frequency.value="6";await frequency.emit("change");
ok(get("daily").textContent==="1","daily score reflected");
let marker=card.children[5].children[0].children[1];marker.value="yes";await marker.emit("change");
ok(a.saved().records.sweet.markers.control==="yes","difficulty controlling recorded");
ok(get("flags").textContent==="1","one concern area counted");
marker=card.children[5].children[1].children[1];marker.value="yes";await marker.emit("change");
ok(get("flags").textContent==="1","multiple concerns don't overcount");
card.children[7].value="Без личных данных";await card.children[7].emit("input");
ok(a.saved().records.sweet.note==="Без личных данных","note persisted");
get("search").value="энергетические напитки";await get("search").emit("input");
ok(get("catalog").children.length===1,"search matching");
await get("catalog").children[0].children[1].emit("click");
ok(a.saved().selected.includes("energy"),"catalog add");
get("search").value="";await get("search").emit("input");
get("customName").value="Своя привычка";await get("addCustom").emit("click");
ok(a.saved().selected.length===13,"custom area add");
ok(Object.values(a.saved().custom).includes("Своя привычка"),"custom label");
await get("snapshot").emit("click");
ok(a.saved().history.length===1,"snapshot saved");
ok(a.saved().history[0].records.sweet.frequency===6,"snapshot frequency");
ok(a.saved().history[0].records.sweet.markers.control==="yes","snapshot reflection");
card=get("items").children[0];frequency=card.children[3];frequency.value="1";await frequency.emit("change");
await get("history").children[0].children[1].emit("click");
ok(a.saved().records.sweet.frequency===6,"snapshot restore frequency");
ok(a.saved().selected.length===13,"snapshot restore selection");
const backup=a.saved(),reopen=launch(backup);
ok(reopen.get("daily").textContent==="1","reload daily");
ok(reopen.saved().records.sweet.note==="Без личных данных","reload note");
const importer=get("importFile"),text=JSON.stringify(backup);
importer.files=[{size:text.length,text:async()=>text}];await importer.emit("change");
ok(a.saved().history.length===1,"import history");
const before=JSON.stringify(a.saved());
importer.files=[{size:20,text:async()=>"{bad"}];await importer.emit("change");
ok(JSON.stringify(a.saved())===before,"corrupted import rejected");
const broken=launch({version:1,selected:["sweet","unknown"],records:{sweet:{frequency:99,markers:{control:"bad",priority:"yes"}}},custom:{},history:[]});
ok(broken.get("count").textContent==="0 / 1","invalid score and unknown ID normalized");
ok(broken.get("flags").textContent==="1","valid concern preserved");
await get("clearCurrent").emit("click");
ok(get("count").textContent==="0 / 13","reset assessments without removing rays");
ok(a.saved().history.length===1,"reset keeps history");
const stale=JSON.stringify(a.saved());a.events.storage({key:"psyToolsHabitFrequencyV1"});
card=get("items").children[0];frequency=card.children[3];frequency.value="6";await frequency.emit("change");
ok(JSON.stringify(a.saved())===stale,"stale tab blocked from overwriting");
ok(get("status").textContent.includes("Перезагрузите"),"stale tab message");
const deleted=launch(backup);await deleted.get("clearAll").emit("click");
ok(!deleted.store.has("psyToolsHabitFrequencyV1"),"delete key only");
console.log("PASS: "+n+" habit frequency wheel smoke checks");
})().catch(e=>{console.error(e);process.exitCode=1});
