/**
 * Browser-like smoke tests for the research matrix, its accessible coordinate
 * directory, retained storage format and write-conflict protection.
 * Run: node tests/nine-streams-ui.test.cjs
 * Does not replace Playwright, physical mobile, or assistive-tech testing.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","research","nine-streams","index.html"),"utf8");
const modelScript=fs.readFileSync(path.join(__dirname,"..","research","nine-streams","model.js"),"utf8");
const inline=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(inline,"inline app script available");
function boot(previous){
  const store=new Map(previous?[["psy-tools.nine-streams.v1",JSON.stringify(previous)]]:[]);
  const registry=new Map(),listeners={};
  class E{
    constructor(tag){this.tag=tag;this.nodes=[];this.events={};this.attrs={};this.dataset={};this.style={};this.textContent="";this.value="";this.checked=false;this.disabled=false;this.className=""}
    get children(){return this.nodes.filter(x=>x.tag!=="#text")}
    append(...elems){this.nodes.push(...elems)}
    appendChild(x){this.nodes.push(x);return x}
    replaceChildren(...elems){this.nodes=[...elems]}
    setAttribute(k,v){this.attrs[k]=String(v)}
    addEventListener(k,fn){(this.events[k]||=[]).push(fn)}
    async emit(k){for(const fn of this.events[k]||[])await fn({target:this,preventDefault(){}})}
    click(){return this.emit("click")}
    remove(){}
  }
  const doc={getElementById(id){if(!registry.has(id))registry.set(id,new E("control"));return registry.get(id)},
    createElement:tag=>new E(tag),createElementNS:(_ns,tag)=>new E(tag),body:new E("body")};
  const win={addEventListener(k,fn){listeners[k]=fn},confirm:()=>true};
  new Function("window","module","exports",modelScript)(win,undefined,undefined);
  const storage={getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const URLs={createObjectURL:()=>"blob:mock",revokeObjectURL(){}};
  new Function("document","window","localStorage","URL","Blob","setTimeout",inline)(
    doc,win,storage,URLs,Blob,fn=>fn());
  return {get:id=>doc.getElementById(id),state:()=>JSON.parse(store.get("psy-tools.nine-streams.v1")||"null"),store,listeners,model:win.NineStreamsModel};
}
(async()=>{
  let checks=0;
  const ok=(condition,label)=>{assert.ok(condition,label);checks++};
  const {get,state,store,listeners,model}=boot();
  ok(get("cell-list").children.length===27,"all 27 cells visible without cube interaction");
  ok(get("cell-summary").textContent.includes("0 из 27"),"initial count separate from score");
  ok(get("streams").children.length===9,"nine original streams available");
  ok(get("organism").value==="human","default human selected");
  const first=get("cell-list").children[0];
  ok(first.attrs["aria-current"]==="true","active coordinate accessible");
  let status=get("streams").children[0].children[0].children[1];
  status.value="present";await status.emit("change");
  ok(state().entries["human|regular|s1"].streams[0].status==="present","persist stream status");
  ok(get("cell-summary").textContent.includes("1 из 27"),"new observation updates coordinate count");
  let slider=get("streams").children[0].children[2].children[0];
  slider.value="0";await slider.emit("input");
  ok(state().entries["human|regular|s1"].streams[0].comfort===0,"0/10 never conflated with missing");
  ok(get("rated-pill").textContent==="1 / 9 оценено","rated progress correct");
  get("note").value="Опыт: слушал музыку";await get("note").emit("change");
  get("evidence").value="Источники ограничены";await get("evidence").emit("change");
  ok(state().entries["human|regular|s1"].note.includes("музыку"),"note saved");
  ok(state().entries["human|regular|s1"].evidence.includes("ограничены"),"source limitations saved");
  get("only-recorded").checked=true;await get("only-recorded").emit("change");
  ok(get("cell-list").children.length===1,"recorded-only filter");
  get("only-recorded").checked=false;await get("only-recorded").emit("change");
  ok(get("cell-list").children.length===27,"clear filter restores all coordinates");
  await get("cell-list").children[1].emit("click");
  ok(get("slice").value==="s2","list button changes time-slice selection");
  ok(get("streams").children[0].children[0].children[1].value==="unknown","other cell remains independent");
  await get("cell-list").children[0].emit("click");
  const saved=state(),reloaded=boot(saved);
  ok(reloaded.get("cell-summary").textContent.includes("1 из 27"),"legacy storage key loads after reload");
  ok(reloaded.get("streams").children[0].children[2].children[1].textContent==="0","reloaded zero rating visible");
  await get("clear-cell").emit("click");
  ok(Object.keys(state().entries).length===0,"single-cell delete only selected entry");
  ok(get("cell-summary").textContent.includes("0 из 27"),"deletion refreshes summary");
  const json=JSON.stringify(saved),file=get("file");
  file.files=[{size:json.length,text:async()=>json}];await file.emit("change");
  ok(state().entries["human|regular|s1"].streams[0].comfort===0,"JSON import restores exact values");
  const before=JSON.stringify(state());
  file.files=[{size:15,text:async()=>"{broken"}];await file.emit("change");
  ok(JSON.stringify(state())===before,"invalid import rejected without mutation");
  const otherTab=boot(saved);
  otherTab.listeners.storage({key:model.STORAGE_KEY});
  const blockedBefore=JSON.stringify(otherTab.state());
  const sel=otherTab.get("streams").children[0].children[0].children[1];
  sel.value="absent";await sel.emit("change");
  ok(JSON.stringify(otherTab.state())===blockedBefore,"other-tab state update not persisted");
  ok(otherTab.get("status").textContent.includes("Перезагрузите"),"conflicting tab displays instruction");
  await otherTab.get("delete-all").emit("click");
  ok(JSON.stringify(otherTab.state())===blockedBefore,"old tab cannot erase other tab data");
  await otherTab.get("import").emit("click");
  const blockedFile=otherTab.get("file");
  blockedFile.files=[{size:json.length,text:async()=>json}];await blockedFile.emit("change");
  ok(JSON.stringify(otherTab.state())===blockedBefore,"old tab cannot import over newer data");
  await get("delete-all").emit("click");
  ok(!store.has("psy-tools.nine-streams.v1"),"delete all clears same local-storage key");
  ok(get("cell-summary").textContent.includes("0 из 27"),"delete all refreshes coordinate list");
  const bat=boot();
  bat.get("organism").value="bat";await bat.get("organism").emit("change");
  ok(bat.get("streams").children[0].children[2].children[0].disabled===true,"animal mode disallows subjective human comfort scores");
  console.log("PASS: "+checks+" research nine-streams UI smoke assertions");
})().catch(error=>{console.error(error);process.exitCode=1});
