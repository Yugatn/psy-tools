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
    runTimer(ms){for(const [id,t] of scheduled){if(t.ms===ms){scheduled.delete(id);time+=ms;t.cb();return true}}return false}
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
  assert.equal(records[0].ratio,1.25);
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
  a.element("pad").fire("pointerup");
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
  assert.ok(bytes.includes(Buffer.from("xl/worksheets/sheet3.xml")));
  assert.ok(bytes.includes(Buffer.from("По сериям")));
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

test("visual verbal estimation hides stimulus duration until a typed answer",()=>{
  const a=makeHarness({task:"estimation",method:"hold"});
  a.click("newSession");
  assert.equal(a.element("method").disabled,true);
  assert.equal(a.element("target").disabled,true);
  assert.ok(a.runTimer(750));
  assert.equal(a.element("stimulus").hidden,false);
  assert.equal(a.element("demoMeter").style.display,"none");
  const demo=Array.from(a.scheduled.values()).find(x=>[3000,5000,7000,10000,12000,15000,20000,30000].includes(x.ms));
  assert.ok(demo,"random visual display duration chosen");
  assert.ok(a.runTimer(demo.ms));
  assert.equal(a.element("stimulus").hidden,true);
  assert.equal(a.element("estimateForm").hidden,false);
  assert.equal(a.element("latestResult").textContent.includes("Фактически"),false,
    "actual duration is not revealed before answer");
  a.element("estimatedSeconds").value="9,5";
  a.element("estimateForm").fire("submit",{preventDefault(){}});
  const [result]=a.records();
  assert.equal(result.task,"estimation");
  assert.equal(result.method,"typed");
  assert.equal(result.target_s,demo.ms/1000);
  assert.equal(result.nominal_target_s,demo.ms/1000);
  assert.equal(result.produced_s,9.5);
  assert.equal(result.error_pct,Number(((9.5-demo.ms/1000)/(demo.ms/1000)*100).toFixed(4)));
});
test("invalid verbal estimate does not save results",()=>{
  const a=makeHarness({task:"estimation"});
  a.click("newSession");
  assert.ok(a.runTimer(750));
  const demo=Array.from(a.scheduled.values()).find(x=>[3000,5000,7000,10000,12000,15000,20000,30000].includes(x.ms));
  assert.ok(demo);
  assert.ok(a.runTimer(demo.ms));
  a.element("estimatedSeconds").value="=1+1";
  a.element("estimateForm").fire("submit",{preventDefault(){}});
  assert.equal(a.records().length,0);
  assert.ok(a.element("estimateError").textContent.includes("Введите число"));
  a.element("estimatedSeconds").value="10";
  a.element("estimateForm").fire("submit",{preventDefault(){}});
  assert.equal(a.records().length,1);
});
test("hiding the browser tab during visual stimulus cancels trial",()=>{
  const a=makeHarness({task:"estimation"});
  a.click("newSession");assert.ok(a.runTimer(750));
  a.document.hidden=true;a.document.fire("visibilitychange");
  assert.equal(a.element("stimulus").hidden,true);
  assert.equal(a.element("estimateForm").hidden,true);
  assert.equal(a.records().length,0);
});

test("blind series hides the actual duration, past table and exports until completion",()=>{
  const a=makeHarness({task:"estimation",attempts:"3",feedback:"blind"});
  a.click("newSession");
  assert.ok(a.runTimer(750));
  const first=Array.from(a.scheduled.values()).find(x=>[3000,5000,7000,10000,12000,15000,20000,30000].includes(x.ms));
  assert.ok(first);
  assert.ok(a.runTimer(first.ms));
  a.element("estimatedSeconds").value="9";
  a.element("estimateForm").fire("submit",{preventDefault(){}});
  assert.equal(a.records().length,1);
  assert.ok(a.element("latestResult").textContent.includes("после завершения серии"));
  assert.equal(a.element("statBias").textContent,"—");
  assert.equal(a.element("xlsx").disabled,true);
  assert.ok(a.element("rows").children[0].children[0].textContent.includes("после последней попытки"));
  a.click("prepare");assert.ok(a.runTimer(750));
  const second=Array.from(a.scheduled.values()).find(x=>[3000,5000,7000,10000,12000,15000,20000,30000].includes(x.ms));
  assert.ok(a.runTimer(second.ms));a.element("estimatedSeconds").value="9";
  a.element("estimateForm").fire("submit",{preventDefault(){}});
  a.click("prepare");assert.ok(a.runTimer(750));
  const third=Array.from(a.scheduled.values()).find(x=>[3000,5000,7000,10000,12000,15000,20000,30000].includes(x.ms));
  assert.ok(a.runTimer(third.ms));a.element("estimatedSeconds").value="9";
  a.element("estimateForm").fire("submit",{preventDefault(){}});
  assert.equal(a.records().length,3);
  assert.equal(a.element("statN").textContent,"3");
  assert.notEqual(a.element("statBias").textContent,"—");
  assert.equal(a.element("xlsx").disabled,false);
});
test("completed-series metrics survive browser refresh from local history",()=>{
  const a=makeHarness({method:"double",feedback:"immediate",attempts:"3"});
  a.click("newSession");
  for(let i=0;i<3;i++){
    if(i)a.click("prepare");
    a.element("pad").fire("pointerdown");
    a.element("pad").fire("pointerup");
    a.advance(1000+i*100);
    a.element("pad").fire("pointerdown");
  }
  assert.equal(a.element("statN").textContent,"3");
  assert.notEqual(a.element("statBias").textContent,"—");
});
test("reproduction never shows a duration-progress bar",()=>{
  const a=makeHarness({task:"reproduction",method:"double"});
  a.click("newSession");a.runTimer(750);
  assert.equal(a.element("stimulus").hidden,false);
  assert.equal(a.element("demoMeter").style.display,"none");
  assert.ok(!a.element("status").textContent.includes("5 секунд"));
  const duration=Array.from(a.scheduled.values()).find(x=>[2000,3000,5000,8000,12000].includes(x.ms));
  assert.ok(duration);
  a.runTimer(duration.ms);
  a.element("pad").fire("pointerdown");a.element("pad").fire("pointerup");a.advance(3000);a.element("pad").fire("pointerdown");
  assert.equal(a.records()[0].target_s,duration.ms/1000);
});

test("second finger or a second pointerdown before release cannot terminate a double tap",()=>{
  const a=makeHarness({method:"double"});
  a.click("newSession");
  a.element("pad").fire("pointerdown",{pointerId:17,isPrimary:true});
  a.advance(500);
  a.element("pad").fire("pointerdown",{pointerId:23,isPrimary:false});
  a.element("pad").fire("pointerdown",{pointerId:17,isPrimary:true});
  assert.equal(a.records().length,0);
  a.element("pad").fire("pointerup",{pointerId:17});
  a.advance(500);
  a.element("pad").fire("pointerdown",{pointerId:18,isPrimary:true});
  assert.equal(a.records().length,1);
  assert.equal(a.records()[0].produced_s,1);
});
