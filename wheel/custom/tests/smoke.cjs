// PSY-TOOLS custom-wheel regression smoke tests. Run: node wheel/custom/tests/smoke.cjs
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const catalog=fs.readFileSync(path.join(__dirname,"..","catalog.js"),"utf8");
const js=html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script defer src="\.\.\/wheel-nav\.js"/)?.[1];
assert.ok(js,"Controller found");
function start(initial){
  const store=new Map(initial?[["wheelBalanceCustomV1",JSON.stringify(initial)]]:[]),nodes=new Map();
  let doc;
  class El{
    constructor(tag){this.tag=tag;this.nodes=[];this.events={};this.attributes={};this.style={};this.dataset={};this.value="";this.textContent="";this.className="";this.disabled=false}
    get children(){return this.nodes.filter(x=>x.tag!=="#text")}
    append(...xs){this.nodes.push(...xs)}
    appendChild(x){this.append(x);return x}
    replaceChildren(...xs){this.nodes=[...xs]}
    setAttribute(k,v){this.attributes[k]=String(v)}
    addEventListener(k,fn){(this.events[k]||=[]).push(fn)}
    async emit(k){for(const fn of this.events[k]||[])await fn({target:this,preventDefault(){}})}
    focus(){doc.activeElement=this}
    scrollIntoView(){}
    remove(){}
    click(){return this.emit("click")}
  }
  doc={getElementById(k){if(!nodes.has(k))nodes.set(k,new El("div"));return nodes.get(k)},createElement:t=>new El(t),createElementNS:(_ns,t)=>new El(t),body:new El("body")};
  const win={addEventListener(){}};
  new Function("window",catalog)(win);
  const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  new Function("document","window","localStorage","confirm","prompt","URL","Blob","setTimeout",js)(doc,win,storage,()=>true,(_,fallback)=>fallback||"Колесо",URL,Blob,fn=>fn());
  const get=k=>doc.getElementById(k),data=()=>JSON.parse(store.get("wheelBalanceCustomV1")||"null"),current=()=>data()?.wheels.find(w=>w.id===data().active);
  return {get,data,current,store,cat:win.PSY_WHEEL_CATALOG};
}
(async()=>{
  let count=0;const ok=(x,msg)=>{assert.ok(x,msg);count++};
  const a=start(),get=a.get;
  ok(a.cat.length>=250,"catalog size");
  ok(new Set(a.cat.map(x=>x.id)).size===a.cat.length,"unique ids");
  ok(get("mean").textContent==="—","unrated average");
  await get("catalogList").children[0].children[1].emit("click");
  ok(a.current().items[0].id===a.cat[0].id,"catalog addition");
  let row=get("selected").children[0],now=row.children[1].children[0].children[1],target=row.children[1].children[1].children[1];
  now.value="6";await now.emit("change");target.value="8";await target.emit("change");
  ok(a.current().items[0].score===6,"score");
  ok(a.current().items[0].goal===8,"target");
  ok(get("mean").textContent==="6.0","mean");
  ok(get("targetGap").textContent==="+2.0","gap");
  row.children[2].children[1].value="Наблюдение";await row.children[2].children[1].emit("input");
  ok(a.current().items[0].note==="Наблюдение","note");
  get("customName").value="Собственный луч";await get("addCustom").emit("click");
  ok(a.current().items.length===2,"custom ray");
  await get("saveSnapshot").emit("click");
  ok(a.current().history.length===1,"snapshot");
  ok(a.current().history[0].items[0].note==="Наблюдение","snapshot note");
  now=get("selected").children[0].children[1].children[0].children[1];now.value="9";await now.emit("change");
  await get("history").children[0].children[1].emit("click");
  ok(a.current().items[0].score===6,"history restore");
  await get("copyWheel").emit("click");
  ok(a.data().wheels.length===2,"copy");
  ok(a.current().items.length===2,"copied rays");
  const first=a.data().wheels[0].id;
  now=get("selected").children[0].children[1].children[0].children[1];now.value="3";await now.emit("change");
  get("wheelSelect").value=first;await get("wheelSelect").emit("change");
  ok(a.current().items[0].score===6,"isolation between wheels");
  await get("newWheel").emit("click");ok(a.current().items.length===0,"blank new wheel");
  await get("starter").emit("click");ok(a.current().items.length===8,"starter");
  ok(get("chart").children.length>10,"SVG chart");
  await get("clearScores").emit("click");
  ok(a.current().items.every(x=>x.score===null&&x.goal===null),"clear scores");
  const saved=a.data(),reloaded=start(saved);
  ok(reloaded.data().wheels.length===3,"reopen wheels");
  ok(reloaded.current().items.length===8,"reopen active rays");
  const input=get("importFile"),payload=JSON.stringify(saved);
  input.files=[{size:payload.length,text:async()=>payload}];await input.emit("change");
  ok(a.data().wheels.length===3,"import");
  const unchanged=JSON.stringify(a.data());
  input.files=[{size:12,text:async()=>"{broken"}];await input.emit("change");
  ok(JSON.stringify(a.data())===unchanged,"bad import rejected");
  const broken=start({version:1,active:"z",wheels:[{id:"z",title:"Test",items:[{id:"x",title:"X",score:99,goal:-1}],history:[]}]});
  ok(broken.get("mean").textContent==="—","bad imported score normalized");
  ok(broken.get("targetGap").textContent==="—","bad imported goal normalized");
  await get("deleteWheel").emit("click");ok(a.data().wheels.length===2,"delete wheel");
  await get("deleteAll").emit("click");ok(!a.store.has("wheelBalanceCustomV1"),"delete all");
  console.log("PASS: "+count+" custom wheel smoke checks");
})().catch(e=>{console.error(e);process.exitCode=1});
