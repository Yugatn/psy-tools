/* Run: node wheel/virtues/tests/smoke.cjs (Node 18+).
 * Regression coverage with simulated DOM/localStorage, not a real-browser test.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const definitions=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
const controller=html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script defer src="\.\.\/wheel-nav\.js"/)?.[1];
assert.ok(controller,"Inline script found");
function launch(seed){
  let document;
  const storage=new Map(seed===undefined?[]:[["wheelBalanceVirtuesV1",JSON.stringify(seed)]]), els=new Map();
  class E{
    constructor(tag){this.tag=tag;this.childrenAll=[];this.events={};this.className="";this.attrs={};this.value="";this.textContent="";this.style={};this.disabled=false;this.dataset={};this.classList={toggle:(n,on)=>{this.flags ||=new Set();on?this.flags.add(n):this.flags.delete(n)}}}
    get children(){return this.childrenAll.filter(x=>x.tag!=="#text")}
    append(...x){this.childrenAll.push(...x)}
    appendChild(x){this.append(x);return x}
    replaceChildren(...x){this.childrenAll=[...x]}
    addEventListener(n,fn){(this.events[n]||=[]).push(fn)}
    async fire(n){for(const fn of this.events[n]||[])await fn({target:this,preventDefault(){}})}
    setAttribute(n,v){this.attrs[n]=String(v)}
    scrollIntoView(){}
    focus(){document.activeElement=this}
    click(){return this.fire("click")}
    remove(){}
  }
  document={getElementById:id=>{if(!els.has(id))els.set(id,new E("div"));return els.get(id)},createElement:tag=>new E(tag),createElementNS:(_,tag)=>new E(tag),createTextNode:value=>{const t=new E("#text");t.textContent=value;return t},body:new E("body")};
  const window={addEventListener(){},print(){}};
  new Function("window",definitions)(window);
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  new Function("document","window","localStorage","confirm","URL","Blob","setTimeout",controller)(document,window,localStorage,()=>true,{createObjectURL:()=>"blob:mock",revokeObjectURL(){}},Blob,fn=>fn());
  const get=id=>document.getElementById(id);
  const snapshot=()=>JSON.parse(storage.get("wheelBalanceVirtuesV1")||"null");
  return {get,snapshot,storage,defs:window.VIRTUE_WHEEL};
}
(async()=>{
  let n=0;const check=(expr,msg)=>{assert.ok(expr,msg);n++};
  const x=launch(),g=x.get;
  check(x.defs.catalog.length===48,"48 definitions");
  check(x.defs.presets.length===6,"six selectable modes");
  check(new Set(x.defs.catalog.map(v=>v.id)).size===48,"stable unique IDs");
  for(const [mode,count] of Object.entries({socrates:5,plato:4,aristotle:9,modern:10,via:24,personal:0})){
    g("mode").value=mode;await g("mode").fire("change");
    check(g("rated").textContent==="0/"+count,"unrated mode "+mode);
    check(g("items").children.length===(count||1),"number of visible items "+mode);
  }
  g("mode").value="socrates";await g("mode").fire("change");
  check(g("average").textContent==="—","empty mean not zero");
  let first=g("items").children[0],value=first.children[1].children[0].children[1];
  value.value="7";await value.fire("change");
  check(x.snapshot().records.socrates.values.wisdom===7,"save score");
  check(g("average").textContent==="7.0","mean");
  check(g("rated").textContent==="1/5","partial completion");
  first=g("items").children[0];let target=first.children[1].children[1].children[1];
  target.value="9";await target.fire("change");
  check(x.snapshot().records.socrates.goals.wisdom===9,"save goal");
  const note=first.children[3];note.value="Записал наблюдение";await note.fire("input");
  check(x.snapshot().records.socrates.notes.wisdom==="Записал наблюдение","save note");
  await g("snapshot").fire("click");
  check(x.snapshot().records.socrates.history.length===1,"save history");
  check(x.snapshot().records.socrates.history[0].notes.wisdom==="Записал наблюдение","history includes notes");
  first=g("items").children[0];value=first.children[1].children[0].children[1];value.value="3";await value.fire("change");
  await g("history").children[0].children[1].fire("click");
  check(x.snapshot().records.socrates.values.wisdom===7,"restore snapshot score");
  check(x.snapshot().records.socrates.goals.wisdom===9,"restore snapshot target");
  g("mode").value="plato";await g("mode").fire("change");
  check(g("average").textContent==="—","models have isolated scores");
  g("mode").value="socrates";await g("mode").fire("change");
  check(g("average").textContent==="7.0","return to socratic model");
  const saved=x.snapshot();check(launch(saved).get("average").textContent==="7.0","restore after reload");
  g("mode").value="personal";await g("mode").fire("change");
  g("customName").value="Моя добродетель";await g("addCustom").fire("click");
  check(x.snapshot().records.personal.ids.length===1,"add custom virtue");
  g("search").value="мудрость";await g("search").fire("input");
  check(g("catalog").children.length>0,"search works");
  g("search").value="";await g("search").fire("input");
  await g("catalog").children[0].children[1].fire("click");
  check(x.snapshot().records.personal.ids.length===2,"add item from catalog");
  await g("items").children[1].children[0].children[1].fire("click");
  check(x.snapshot().records.personal.ids.length===1,"remove ray");
  await g("clearMode").fire("click");
  check(x.snapshot().records.personal.ids.length===0,"clear personal selection");
  const file=g("importFile"),backup=JSON.stringify(saved);
  file.files=[{size:backup.length,text:async()=>backup}];await file.fire("change");
  check(x.snapshot().records.socrates.values.wisdom===7,"JSON import restores score");
  const before=JSON.stringify(x.snapshot());
  file.files=[{size:15,text:async()=>"{invalid"}];await file.fire("change");
  check(JSON.stringify(x.snapshot())===before,"malformed backup rejected");
  const malformed=launch({version:1,mode:"socrates",records:{socrates:{ids:["wisdom","missing"],values:{wisdom:77},goals:{wisdom:-2},history:[]}}});
  check(malformed.get("rated").textContent==="0/1","malformed score and unknown ray sanitized in UI");
  check(malformed.get("average").textContent==="—","malformed score excluded from mean");
  await g("clearAll").fire("click");
  check(!x.storage.has("wheelBalanceVirtuesV1"),"clear localStorage");
  console.log("PASS: "+n+" virtues wheel smoke assertions");
})().catch(err=>{console.error(err);process.exitCode=1});
