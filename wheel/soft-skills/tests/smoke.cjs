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
  const elements=new Map();
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
    document,storage,{print(){}},()=>true,()=> "Анонимный профиль"
  );
  const json=()=>JSON.parse(store.get("psyToolsSoftSkillsV1")||"null");
  return {get,store,json,document};
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
  get("notes").value="Наблюдение без личных данных";
  await get("notes").emit("input");
  await get("saveSnapshot").emit("click");
  ok(json().records["6|together"].history[0].notes==="Наблюдение без личных данных","snapshot saves notes");

  await get("skills").children[0].querySelectorAll(".ratings button")[9].emit("click");
  ok(get("delta").textContent==="+2.0","delta compares shared skills");
  await get("history").children[0].children[1].emit("click");
  ok(get("average").textContent==="7.0","history restore loads previous values");
  ok(get("notes").value==="Наблюдение без личных данных","history restore loads previous notes");

  await get("addProfile").emit("click");
  ok(json().profiles.length===2,"second anonymous profile created");
  ok(get("ratedCount").textContent==="0/4","new profile starts empty");
  await get("skills").children[0].querySelectorAll(".ratings button")[3].emit("click");
  ok(json().records["p2::6|together"].values.emotions===3,"new profile has independent values");
  ok(json().records["6|together"].values.emotions===7,"default profile unchanged");
  const remembered=createApp(json());
  ok(remembered.get("profile").value==="p2","non-default active profile survives reload");
  ok(remembered.get("average").textContent==="3.0","reloaded active profile shows its own records");
  get("age").value="12-16";await get("age").emit("change");
  ok(get("skills").children.length===12,"adolescent wheel has twelve skills");
  get("profile").value="default";await get("profile").emit("change");
  get("age").value="6";await get("age").emit("change");
  ok(get("average").textContent==="7.0","switching restores default profile");
  const stored=json();
  const reopened=createApp(stored);
  ok(reopened.get("average").textContent==="7.0","data survives simulated reload");

  const legacy={version:1,records:{"6|together":{values:{emotions:5},notes:"Старый формат",history:[{date:"2026-11-11T00:00:00.000Z",values:{emotions:4}}]}}};
  const migration=createApp(legacy);
  ok(migration.get("average").textContent==="5.0","v1 data migrates without loss");
  ok(migration.get("notes").value==="Старый формат","v1 note preserved");
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
  const beforeInvalid=JSON.stringify(app.json());
  input.files=[{size:20,text:async()=>"{ not valid JSON"}];
  await input.emit("change");
  ok(JSON.stringify(app.json())===beforeInvalid,"malformed JSON does not overwrite existing data");
  await app.get("clearAll").emit("click");
  ok(!app.store.has("psyToolsSoftSkillsV1"),"clear all removes local storage key");

  console.log("PASS: "+total+" smoke checks for children's soft-skills wheel");
})().catch(err=>{console.error(err);process.exitCode=1});
