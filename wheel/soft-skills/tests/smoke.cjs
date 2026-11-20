/**
 * Reproducible dependency-free smoke tests.
 * Run from repository root:
 *   node wheel/soft-skills/tests/smoke.cjs
 *
 * These tests simulate browser DOM and localStorage events; they do not replace
 * cross-browser visual, accessibility or device tests.
 */
"use strict";
const {readFileSync}=require("node:fs");
const {join}=require("node:path");
const html=readFileSync(join(__dirname,"..","index.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!script)throw Error("Could not find inline app script");

function check(test,msg){if(!test)throw Error("FAIL: "+msg)}
function createApp(initialData){
  const store=new Map(initialData?[[ "psyToolsSoftSkillsV1",JSON.stringify(initialData) ]]:[]);
  const elements=new Map(),windowEvents={};
  let document;
  class Element{
    constructor(tag){this.tag=tag;this.nodes=[];this.listeners={};this.attributes={};this.dataset={};this.style={};this.className="";this.textContent="";this.value="";this.disabled=false;this.classList={toggle:(name,enabled)=>{this.classes ||= new Set();if(enabled)this.classes.add(name);else this.classes.delete(name)}}}
    get children(){return this.nodes.filter(n=>n.tag!=="#text")}
    append(...nodes){this.nodes.push(...nodes)}
    appendChild(node){this.append(node);return node}
    replaceChildren(...nodes){this.nodes=[...nodes]}
    setAttribute(key,value){this.attributes[key]=String(value)}
    addEventListener(type,callback){(this.listeners[type] ||= []).push(callback)}
    async emit(type,extra={}){for(const fn of this.listeners[type]||[])await fn({target:this,preventDefault(){},...extra})}
    querySelectorAll(query){if(query!==".ratings button")return [];const group=this.children.find(x=>x.className==="ratings");return group?group.children.filter(x=>x.tag==="button"):[]}
    querySelector(query){if(query===".clear")return this.children.flatMap(x=>x.tag==="div"?x.children:[]).find(x=>x.className==="clear");return null}
    scrollIntoView(){}
    focus(){document.activeElement=this}
    click(){return this.emit("click")}
    remove(){}
  }
  document={
    getElementById(id){if(!elements.has(id))elements.set(id,new Element("div"));return elements.get(id)},
    createElement(tag){return new Element(tag)},
    createElementNS(ns,tag){return new Element(tag)},
    createTextNode(text){const x=new Element("#text");x.textContent=text;return x},
    body:new Element("body"),activeElement:null
  };
  const storage={
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>{store.set(key,String(value))},
    removeItem:key=>store.delete(key)
  };
  const get=id=>document.getElementById(id);
  new Function("document","localStorage","window","confirm","prompt",script)(
    document,storage,{print(){},addEventListener(name,callback){windowEvents[name]=callback}},()=>true,()=> "Анонимный профиль"
  );
  const json=()=>JSON.parse(store.get("psyToolsSoftSkillsV1")||"null");
  return {get,store,json,document,windowEvents};
}

(async()=>{
  let total=0;
  function ok(value,name){check(value,name);total++}
  const app=createApp();const {get,json}=app;
  ok(get("skills").children.length===4,"6-year-old program has four skills");
  ok(get("average").textContent==="—","unrated scores have no numeric average");

  await get("skills").children[0].querySelectorAll(".ratings button")[7].emit("click");
  ok(json().records["6|together"].values.emotions===7,"score saved in legacy-compatible record");
  ok(get("average").textContent==="7.0","average updated");
  ok(app.document.activeElement===get("skills").children[0].querySelectorAll(".ratings button")[7],"keyboard focus preserved");
  await get("useSuggestedPractice").emit("click");
  ok(json().records["6|together"].plans.emotions.task.length>10,"suggested exercise becomes editable practice");
  get("practiceStatus").value="in-progress";await get("practiceStatus").emit("change");
  ok(json().records["6|together"].plans.emotions.status==="in-progress","practice stage saved independently");
  get("practiceReflection").value="Назвали три эмоции";await get("practiceReflection").emit("input");
  ok(json().records["6|together"].plans.emotions.reflection==="Назвали три эмоции","practice observation saved");
  ok(get("practiceSummary").textContent.includes("1 в процессе"),"practice progress summary");
  get("notes").value="Наблюдение без личных данных";
  await get("notes").emit("input");
  await get("saveSnapshot").emit("click");
  ok(json().records["6|together"].history[0].notes==="Наблюдение без личных данных","snapshot saves notes");
  ok(json().records["6|together"].history[0].plans.emotions.status==="in-progress","snapshot captures per-skill practice");

  await get("skills").children[0].querySelectorAll(".ratings button")[9].emit("click");
  ok(get("delta").textContent==="+2.0","delta compares shared skills");
  get("practiceStatus").value="tried";await get("practiceStatus").emit("change");
  ok(get("practiceSummary").textContent.includes("1 попробовано"),"tried status is displayed");
  await get("history").children[0].children[1].emit("click");
  ok(get("average").textContent==="7.0","history restore loads previous values");
  ok(get("notes").value==="Наблюдение без личных данных","history restore loads previous notes");
  ok(get("practiceStatus").value==="in-progress","history restores practice stage");
  ok(get("practiceReflection").value==="Назвали три эмоции","history restores practice reflection");

  await get("addProfile").emit("click");
  ok(json().profiles.length===2,"second anonymous profile created");
  ok(get("ratedCount").textContent==="0/4","new profile starts empty");
  ok(get("practiceTask").value==="","new child profile does not see other child's practice");
  await get("skills").children[0].querySelectorAll(".ratings button")[3].emit("click");
  ok(json().records["p2::6|together"].values.emotions===3,"new profile has independent values");
  ok(json().records["6|together"].values.emotions===7,"default profile unchanged");
  const remembered=createApp(json());
  ok(remembered.get("profile").value==="p2","non-default active profile survives reload");
  ok(remembered.get("average").textContent==="3.0","reloaded active profile shows its own records");
  get("age").value="12-16";await get("age").emit("change");
  ok(get("skills").children.length===12,"adolescent wheel has twelve skills");
  get("observer").value="child";await get("observer").emit("change");
  ok(get("ratedCount").textContent==="0/12","child observer ratings separated");
  const restoredContext=createApp(json());
  ok(restoredContext.get("age").value==="12-16","last age program persists after reload");
  ok(restoredContext.get("observer").value==="child","last observer role persists after reload");
  ok(restoredContext.get("profile").value==="p2","age and observer context bound to selected profile");
  get("observer").value="together";await get("observer").emit("change");
  get("profile").value="default";await get("profile").emit("change");
  get("age").value="6";await get("age").emit("change");
  ok(get("average").textContent==="7.0","switching restores default profile");
  ok(get("practiceStatus").value==="in-progress","switching restores child's practice");
  const stored=json();
  const reopened=createApp(stored);
  ok(reopened.get("average").textContent==="7.0","data survives simulated reload");
  ok(reopened.get("practiceReflection").value==="Назвали три эмоции","practice survives simulated reload");
  const onlyPractice=createApp();
  await onlyPractice.get("useSuggestedPractice").emit("click");
  await onlyPractice.get("saveSnapshot").emit("click");
  ok(onlyPractice.json().records["6|together"].history.length===1,"practice-only progress snapshot is permitted");
  ok(Object.keys(onlyPractice.json().records["6|together"].history[0].values).length===0,"practice-only snapshot keeps scores unrated");

  const legacy={version:1,records:{"6|together":{values:{emotions:5},notes:"Старый формат",history:[{date:"2026-11-11T00:00:00.000Z",values:{emotions:4}}]}}};
  const migration=createApp(legacy);
  ok(migration.get("average").textContent==="5.0","v1 data migrates without loss");
  ok(migration.get("notes").value==="Старый формат","v1 note preserved");
  ok(migration.get("practiceTask").value==="","legacy JSON works without per-skill plans");
  ok(migration.get("age").value==="6"&&migration.get("observer").value==="together","old backups default to age six and combined observer");
  await migration.get("clearCurrent").emit("click");
  ok(migration.get("ratedCount").textContent==="0/4","current context can be cleared");

  const p=app.get("profile");p.value="p2";await p.emit("change");
  await app.get("deleteProfile").emit("click");
  ok(app.json().profiles.length===1,"delete profile removes it");
  ok(!Object.keys(app.json().records).some(k=>k.startsWith("p2::")),"deleted profile records removed");
  const input=app.get("importFile");
  const backup=JSON.stringify(stored);
  input.files=[{size:backup.length,text:async()=>backup}];
  await input.emit("change");
  ok(app.json().profiles.length===2,"import restores all profiles");
  ok(app.json().records["p2::6|together"].values.emotions===3,"import restores separate child records");
  ok(app.json().records["6|together"].plans.emotions.status==="in-progress","JSON import restores per-skill plan");
  ok(app.json().context.age==="6"&&app.json().context.observer==="together","JSON import restores selected context");
  const inactive=createApp(stored);
  inactive.windowEvents.storage({key:"psyToolsSoftSkillsV1"});
  const staleBackup=JSON.stringify(inactive.json());
  inactive.get("practiceTask").value="Не должно перезаписать запись";
  await inactive.get("practiceTask").emit("input");
  ok(JSON.stringify(inactive.json())===staleBackup,"other-tab changes block practice writes");
  ok(inactive.get("status").textContent.includes("Перезагрузите"),"cross-tab conflict shown to user");
  const oldAge=inactive.get("age").value;inactive.get("age").value="12-16";await inactive.get("age").emit("change");
  ok(inactive.get("age").value===oldAge,"stale tab cannot switch persisted program");
  const beforeInvalid=JSON.stringify(app.json());
  input.files=[{size:20,text:async()=>"{ not valid JSON"}];
  await input.emit("change");
  ok(JSON.stringify(app.json())===beforeInvalid,"malformed JSON does not overwrite existing data");
  await app.get("clearAll").emit("click");
  ok(!app.store.has("psyToolsSoftSkillsV1"),"clear all removes local storage key");

  console.log("PASS: "+total+" smoke checks for children's soft-skills wheel");
})().catch(err=>{console.error(err);process.exitCode=1});
