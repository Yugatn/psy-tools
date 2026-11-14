/** Regression: nested four-aspect virtue wheel. Run: node wheel/virtues/tests/detail-smoke.cjs */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"..","detail.html"),"utf8"),dataJS=fs.readFileSync(path.join(__dirname,"..","data.js"),"utf8");
const script=html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script defer src="\.\.\/wheel-nav\.js"/)?.[1];
assert.ok(script,"Detail controller script exists");
function launch(query,initial){
 let document;const nodes=new Map(),store=new Map(initial===undefined?[]:[["wheelBalanceVirtuesV1",JSON.stringify(initial)]]);
 class E{
  constructor(tag){this.tag=tag;this.nodes=[];this.events={};this.attributes={};this.textContent="";this.value="";this.style={};this.className="";this.dataset={};this.hidden=false}
  get children(){return this.nodes.filter(x=>x.tag!=="#text")}
  append(...xs){this.nodes.push(...xs)}
  appendChild(e){this.append(e);return e}
  replaceChildren(...xs){this.nodes=[...xs]}
  setAttribute(k,v){this.attributes[k]=String(v)}
  addEventListener(k,fn){(this.events[k]||=[]).push(fn)}
  async fire(k){for(const fn of this.events[k]||[])await fn({target:this,preventDefault(){}})}
  click(){return this.fire("click")}
  scrollIntoView(){}
  focus(){document.activeElement=this}
  remove(){}
 }
 document={getElementById(id){if(!nodes.has(id))nodes.set(id,new E("div"));return nodes.get(id)},createElement:tag=>new E(tag),createElementNS:(_ns,tag)=>new E(tag),body:new E("body")};
 const win={location:{search:query},addEventListener(){},print(){}};
 new Function("window",dataJS)(win);
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 new Function("document","window","localStorage","confirm","URLSearchParams",script)(document,win,storage,()=>true,URLSearchParams);
 const get=id=>document.getElementById(id),current=()=>JSON.parse(store.get("wheelBalanceVirtuesV1")||"null");
 return {get,current,store};
}
(async()=>{
 let n=0;const check=(v,msg)=>{assert.ok(v,msg);n++};
 const a=launch("?mode=socrates&id=wisdom"),get=a.get;
 check(get("workspace").hidden===false,"valid virtue route");
 check(get("pageTitle").textContent.includes("Мудрость"),"correct virtue selected");
 check(get("aspects").children.length===4,"four drilldown aspects");
 check(get("coverage").textContent==="0/4","unrated separate from zero");
 check(get("average").textContent==="—","empty mean");
 let x=get("aspects").children[0].children[3];x.value="0";await x.fire("change");
 check(get("coverage").textContent==="1/4","zero is assessed");
 check(get("average").textContent==="0.0","zero average");
 x=get("aspects").children[2].children[3];x.value="8";await x.fire("change");
 check(get("average").textContent==="4.0","two aspects mean");
 let saved=a.current();
 check(saved.records.socrates.details.wisdom.ratings.action===8,"persist independent aspect");
 get("evidence").value="В споре уточнил основания";await get("evidence").fire("input");
 get("plan").value="Задавать один уточняющий вопрос в следующем споре";await get("plan").fire("input");
 check(a.current().records.socrates.details.wisdom.evidence.includes("основания"),"save behavioral example");
 check(a.current().records.socrates.details.wisdom.plan.includes("вопрос"),"save action plan");
 await get("saveSnapshot").fire("click");
 check(a.current().records.socrates.details.wisdom.history.length===1,"nested history");
 check(a.current().records.socrates.details.wisdom.history[0].ratings.action===8,"history includes all scores");
 x=get("aspects").children[2].children[3];x.value="3";await x.fire("change");
 await get("history").children[0].children[1].fire("click");
 check(a.current().records.socrates.details.wisdom.ratings.action===8,"restore snapshot aspect");
 await get("reset").fire("click");
 check(Object.keys(a.current().records.socrates.details.wisdom.ratings).length===0,"reset ratings");
 check(a.current().records.socrates.details.wisdom.history.length===1,"reset preserves history");
 const reload=launch("?mode=socrates&id=wisdom",a.current());
 check(reload.get("evidence").value.includes("основания"),"reload evidence");
 check(reload.get("history").children.length===1,"reload history");
 const invalid=launch("?mode=socrates&id=does-not-exist");
 check(invalid.get("workspace").hidden===true,"invalid id gracefully rejected");
 const legacy={version:1,mode:"socrates",records:{socrates:{ids:["wisdom"],custom:{},values:{wisdom:7},goals:{},notes:{},history:[]}}};
 const b=launch("?mode=socrates&id=wisdom",legacy);
 check(b.get("workspace").hidden===false,"legacy v1 supports drilldown");
 x=b.get("aspects").children[0].children[3];x.value="6";await x.fire("change");
 check(b.current().records.socrates.values.wisdom===7,"parent scores untouched");
 const personal={version:1,mode:"personal",records:{personal:{ids:["user-test-abc"],custom:{"user-test-abc":"Бережность"},values:{},goals:{},notes:{},history:[]}}};
 const custom=launch("?mode=personal&id=user-test-abc",personal);
 check(custom.get("pageTitle").textContent.includes("Бережность"),"custom virtue detail");
 console.log("PASS: "+n+" nested virtue wheel smoke assertions");
})().catch(e=>{console.error(e);process.exitCode=1});
