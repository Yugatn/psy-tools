// Run with: node --test time-perception/test.cjs
// Zero external dependencies. The app is exercised with a deterministic DOM stub.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {Blob} = require("node:buffer");
const {TextEncoder} = require("node:util");

const html = fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,"Embedded app script must exist");
new vm.Script(script[1],{filename:"time-perception/index.html"});

function makeHarness(options = {}) {
  const elements = new Map(), listeners = {};
  let active = null, time = 1000, timerId = 1;
  const scheduled = new Map(), stored = new Map(), files = [];
  let document;
  function element(id) {
    if (!elements.has(id)) {
      const handlers = {};
      const e = {
        id,tagName:"DIV",value:"",textContent:"",style:{},children:[],disabled:false,
        handlers,classList:{add(){},remove(){}},
        addEventListener(type,cb){(handlers[type] ||= []).push(cb)},
        click(){for(const cb of handlers.click||[]) cb({preventDefault(){}})},
        fire(type,extra={}){for(const cb of handlers[type]||[]) cb({button:0,pointerId:1,preventDefault(){},...extra})},
        focus(){document.activeElement=this},
        blur(){document.activeElement=null},
        replaceChildren(){this.children=[]},
        append(...nodes){this.children.push(...nodes)},
        remove(){},
        setPointerCapture(){}
      };
      elements.set(id,e);
    }
    return elements.get(id);
  }
  document = {
    activeElement:null,hidden:false,body:{append(){}},
    getElementById:element,
    createElement(tag){const e=element("el-"+elements.size);e.tagName=tag.toUpperCase();return e},
    addEventListener(type,cb){(listeners[type] ||= []).push(cb)},
    fire(type,extra={}){for(const cb of listeners[type]||[])cb(extra)}
  };
  const windowHandlers = {};
  const window = {
    addEventListener(type,cb){(windowHandlers[type] ||= []).push(cb)},
    fire(type,extra={}){for(const cb of windowHandlers[type]||[]) cb(extra)}
  };
  Object.assign(options,{});
  for (const [key,value] of Object.entries({
    task:"production",method:"tap",target:"1",attempts:"3",context:"",...options
  })) element(key).value=value;
  const localStorage = {
    getItem(key){return stored.get(key)||null},
    setItem(key,value){stored.set(key,value)},
    removeItem(key){stored.delete(key)}
  };
  const URLmock = {createObjectURL(blob){files.push(blob);return "blob://test"},
    revokeObjectURL(){}};
  const context = {
    document,window,localStorage,Blob,TextEncoder,URL:URLmock,
    performance:{now(){return time}},
    confirm(){return true},
    setTimeout(cb,ms){const id=timerId++;scheduled.set(id,{cb,ms});return id},
    clearTimeout(id){scheduled.delete(id)},
    requestAnimationFrame(cb){cb()},
    Date,Math,Number,String,Array,Object,JSON,Map,Set,Promise,
    isFinite,parseFloat,parseInt
  };
  vm.runInNewContext(script[1],context,{filename:"time-perception/index.html"});
  return {
    element,document,window,files,scheduled,
    advance(ms){time+=ms},
    click(id){element(id).click()},
    records(){return JSON.parse(stored.get("psytools.time-perception.v1")||"[]")},
    runTimer(ms){for(const [id,t] of scheduled){if(t.ms===ms){scheduled.delete(id);t.cb();return true}}return false}
  };
}
test("one tap measures relative timing error and saves locally",()=>{
  const a=makeHarness();
  a.click("newSession");
  a.click("startTap");
  a.advance(1250);
  a.element("pad").fire("pointerdown");
  const records=a.records();
  assert.equal(records.length,1);
  assert.equal(records[0].target_s,1);
  assert.equal(records[0].produced_s,1.25);
  assert.equal(records[0].error_pct,25);
  assert.equal(records[0].ratio,0.8);
  assert.equal(a.element("statN").textContent,"1");
});
test("hold by pointer measures from down to up",()=>{
  const a=makeHarness({method:"hold"});
  a.click("newSession");
  a.element("pad").fire("pointerdown");
  a.advance(900);
  a.element("pad").fire("pointerup");
  assert.equal(a.records().length,1);
  assert.equal(a.records()[0].error_pct,-10);
  assert.equal(a.records()[0].method,"hold");
});
test("spacebar hold starts at keydown and ends at keyup",()=>{
  const a=makeHarness({method:"hold"});
  a.click("newSession");
  a.window.fire("keydown",{code:"Space",repeat:false,preventDefault(){}});
  a.advance(1100);
  a.window.fire("keyup",{code:"Space",preventDefault(){}});
  assert.equal(a.records().length,1);
  assert.equal(a.records()[0].produced_s,1.1);
});
test("reproduction shows stimulus first, then measures two taps",()=>{
  const a=makeHarness({task:"reproduction",method:"double"});
  a.click("newSession");
  assert.ok(a.runTimer(750));
  const demo=Array.from(a.scheduled.values()).find(x=>[2000,3000,5000,8000,12000].includes(x.ms));
  assert.ok(demo,"one of the prespecified random durations was selected");
  assert.ok(a.runTimer(demo.ms));
  a.element("pad").fire("pointerdown");
  a.advance(2500);
  a.element("pad").fire("pointerdown");
  const r=a.records()[0];
  assert.equal(r.task,"reproduction");
  assert.equal(r.target_s,demo.ms/1000);
  assert.equal(r.produced_s,2.5);
});
test("xlsx and CSV exports contain recognizable formats and summary sheet",async()=>{
  const a=makeHarness();
  a.click("newSession");
  a.click("startTap");
  a.advance(800);
  a.element("pad").fire("pointerdown");
  a.click("xlsx");
  a.click("csv");
  assert.equal(a.files.length,2);
  const bytes=Buffer.from(await a.files[0].arrayBuffer());
  assert.equal(bytes.toString("binary",0,4),"PK\x03\x04");
  assert.ok(bytes.includes(Buffer.from("xl/worksheets/sheet1.xml")));
  assert.ok(bytes.includes(Buffer.from("xl/worksheets/sheet2.xml")));
  assert.ok(bytes.includes(Buffer.from("Статистика")));
  const csv=await a.files[1].text();
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes(";"));
  assert.ok(csv.includes('"Ошибка (%)"'));
});
test("hiding the tab cancels unfinished trial",()=>{
  const a=makeHarness();
  a.click("newSession");
  a.click("startTap");
  a.document.hidden=true;
  a.document.fire("visibilitychange");
  a.advance(2500);
  a.element("pad").fire("pointerdown");
  assert.equal(a.records().length,0);
});
