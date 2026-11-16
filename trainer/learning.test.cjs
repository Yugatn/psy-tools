/* Node's built-in test runner: node --test trainer/*.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const data=require("./data.js");
const core=require("./core.js");
const learning=require("./learning.js");
const stamp="2026-11-16T07:00:00.000Z";
function answered(id="s01"){
  return core.answer(core.freshState(),id,0,data,stamp);
}
test("default is no journal, no persistent identity or implied mastery",()=>{
  assert.deepEqual(learning.freshJournal(),{version:1,entries:{}});
  assert.equal(learning.REVIEW.editorial,"на проверке");
  assert.equal(learning.REVIEW.evidence,"не подтверждено");
  assert.equal(learning.learningStatus(data.scenarios[0],null,learning.freshJournal()),"не начато");
  assert.equal(learning.learningStatus(data.scenarios[0],answered().responses.s01,learning.freshJournal()),"в процессе");
});
test("age bands align to the authored book's four trajectories",()=>{
  assert.deepEqual(data.ages.map(a=>a.id),["4-6","7-11","12-17","18+"]);
  for (const age of data.ages) assert.equal(data.scenarios.filter(s=>s.age===age.id).length,4);
});
test("calendar day validation rejects invalid or impossible dates",()=>{
  assert.equal(Number.isNaN(learning.dateNumber("2026-02-29")),true);
  assert.equal(Number.isNaN(learning.dateNumber("2026-2-3")),true);
  assert.equal(Number.isNaN(learning.dateNumber("tomorrow")),true);
  assert.equal(learning.dateNumber("2026-11-16"),Date.UTC(2026,10,16));
});
test("a practice needs at least one observable criterion",()=>{
  const empty=learning.freshJournal();
  assert.throws(()=>learning.record(empty,data,"s01",[],"2026-11-16"));
  assert.throws(()=>learning.record(empty,data,"missing",[0],"2026-11-16"));
  assert.deepEqual(empty,learning.freshJournal());
});
test("partial performance is visible but never counted as consolidation",()=>{
  const answer=answered(), item=data.scenarios[0];
  let log=learning.record(learning.freshJournal(),data,"s01",[0],"2026-11-16");
  log=learning.record(log,data,"s01",[0],"2026-11-21");
  assert.equal(learning.learningStatus(item,answer.responses.s01,log),"в процессе");
});
test("two complete attempts on distinct days spaced at least three days are required",()=>{
  const answer=answered(),item=data.scenarios[0];
  let log=learning.record(learning.freshJournal(),data,"s01",[0,1],"2026-11-16");
  log=learning.record(log,data,"s01",[0,1],"2026-11-17");
  assert.equal(learning.learningStatus(item,answer.responses.s01,log),"в процессе");
  log=learning.record(log,data,"s01",[0,1],"2026-11-19");
  assert.equal(learning.learningStatus(item,answer.responses.s01,log),"закреплено");
  assert.equal(learning.stats(answer,log,data,"4-6").reinforced,1);
});
test("same-day repeats replace evidence, not multiply practiced days",()=>{
  let log=learning.record(learning.freshJournal(),data,"s01",[0],"2026-11-16");
  log=learning.record(log,data,"s01",[0,1],"2026-11-16");
  assert.equal(log.entries.s01.length,1);
  assert.deepEqual(log.entries.s01[0].met,[0,1]);
});
test("due recommendation prioritizes spaced repetition before new items",()=>{
  const answer=answered();
  const early=learning.record(learning.freshJournal(),data,"s01",[0,1],"2026-11-12");
  assert.equal(learning.isDue(data.scenarios[0],answer.responses.s01,early,"2026-11-16"),true);
  assert.equal(learning.recommend(answer,early,data,"4-6",null,"2026-11-16").id,"s01");
  assert.equal(learning.recommend(answer,early,data,"4-6",null,"2026-11-13").id,"s02");
});
test("undo last entry restores status and doesn't touch other records",()=>{
  const answer=answered();
  let log=learning.record(learning.freshJournal(),data,"s01",[0,1],"2026-11-12");
  log=learning.record(log,data,"s01",[0,1],"2026-11-16");
  const after=learning.undoLast(log,data,"s01");
  assert.equal(learning.learningStatus(data.scenarios[0],answer.responses.s01,after),"в процессе");
  assert.equal(log.entries.s01.length,2);
  assert.equal(after.entries.s01.length,1);
  assert.deepEqual(learning.undoLast(after,data,"s01"),learning.freshJournal());
});
test("import of v1 keeps answers and notes without inventing historical repetitions",()=>{
  const original=core.practice(answered(),"s01",{practiced:true,note:"Моя заметка",before:2,after:4},data);
  const output=learning.importBundle(JSON.parse(core.safeJSON(original,data)),data,core);
  assert.equal(output.legacy,true);
  assert.equal(output.state.responses.s01.note,"Моя заметка");
  assert.equal(output.state.responses.s01.practiced,true);
  assert.deepEqual(output.journal,learning.freshJournal());
});
test("v2 backup roundtrip retains both journal and reflection",()=>{
  const original=core.practice(answered(),"s01",{practiced:true,note:"Рефлексия",before:2,after:3},data);
  const log=learning.record(learning.freshJournal(),data,"s01",[0,1],"2026-11-16");
  const saved=learning.exportBundle(original,log,data,core);
  const output=learning.importBundle(JSON.parse(saved),data,core);
  assert.equal(output.legacy,false);
  assert.equal(output.state.responses.s01.note,"Рефлексия");
  assert.equal(output.journal.entries.s01[0].day,"2026-11-16");
});
test("malformed or unknown entries are dropped; unsupported versions are rejected",()=>{
  const norm=learning.normalizeJournal({version:1,entries:{
    s01:[{day:"2026-11-16",met:[-1,0,0,1,987]},{day:"2026-30-50",met:[0]}],
    unknown:[{day:"2026-11-16",met:[0]}]
  }},data);
  assert.deepEqual(Object.keys(norm.entries),["s01"]);
  assert.deepEqual(norm.entries.s01[0].met,[0,1]);
  assert.throws(()=>learning.importBundle({version:2,format:"fake",responses:{}},data,core));
  assert.throws(()=>learning.importBundle({version:2,format:"psy-tools/adaptive-skill-trainer",responses:{}},data,core));
});
test("privacy: UI never sends to a server, parses imports or notes as text",()=>{
  const js=fs.readFileSync(path.join(__dirname,"app.js"),"utf8");
  assert.doesNotMatch(js,/\bfetch\s*\(|\bXMLHttpRequest\b|\.innerHTML\s*=/);
  assert.match(js,/learning\.importBundle/);
  assert.match(js,/learning\.record/);
  assert.match(js,/learning\.undoLast/);
  assert.match(js,/JOURNAL/);
  const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
  assert.match(html,/learning\.js/);
  assert.match(html,/Content-Security-Policy/);
});
