/* node --test trainer/test.cjs */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const data = require("./data.js");
const core = require("./core.js");
test("curriculum structure is valid, 16 unique scenarios and 4 age ranges", () => {
  assert.equal(core.validateCurriculum(data), true);
  assert.equal(data.scenarios.length, 16);
  assert.equal(new Set(data.scenarios.map(s => s.id)).size, 16);
  for (const age of data.ages) assert.equal(data.scenarios.filter(s => s.age === age.id).length, 4);
});
test("every scenario has feedback and observable indicators", () => {
  for (const s of data.scenarios) {
    assert.equal(s.options.length, 3);
    assert.equal(s.criteria.length >= 2, true);
    assert.equal(s.questions.length >= 2, true);
    assert.equal(s.options.some(o => o.type === "supportive"), true);
    assert.equal(s.options.some(o => o.type === "risky"), true);
  }
});
test("fresh state contains no tracked information", () => {
  assert.deepEqual(core.freshState(), {version: 1, responses: {}});
  assert.deepEqual(core.progress(core.freshState(), data, "5-7"), {total: 4, explored: 0, practiced: 0});
});
test("answer is recorded without altering previous object", () => {
  const first = core.freshState();
  const second = core.answer(first, "s01", 0, data, "2026-11-15T00:00:00.000Z");
  assert.equal(first.responses.s01, undefined);
  assert.equal(second.responses.s01.option, 0);
  assert.deepEqual(core.progress(second, data, "5-7"), {total: 4, explored: 1, practiced: 0});
});
test("practice only registers after selecting option and never asserts clinical mastery", () => {
  assert.throws(() => core.practice(core.freshState(), "s01", {practiced:true}, data));
  let state = core.answer(core.freshState(), "s01", 1, data);
  state = core.practice(state, "s01", {practiced: true, before: 2, after: 4, note: "Попробовал безопасную паузу"}, data);
  assert.equal(core.progress(state, data, "5-7").practiced, 1);
  assert.equal(state.responses.s01.after, 4);
  assert.equal("mastery" in state.responses.s01, false);
  const changed = core.answer(state, "s01", 2, data);
  assert.equal(changed.responses.s01.practiced, false);
  assert.equal(changed.responses.s01.note, "");
});
test("invalid answer and unsupported schema are rejected", () => {
  assert.throws(() => core.answer(core.freshState(), "no-such-id", 0, data));
  assert.throws(() => core.answer(core.freshState(), "s01", 3, data));
  assert.throws(() => core.normalizeState({version: 999, responses: {}}, data));
  assert.throws(() => core.normalizeState({version: 1, responses: []}, data));
});
test("untrusted import drops unknown IDs and limits note length and ratings", () => {
  const state = core.normalizeState({
    version:1,
    responses:{
      s01: {option:0, practiced:true, note:"x".repeat(2000), before: 30, after: 3},
      "__proto__": {option:0, practiced:true},
      unknown: {option:1, practiced:true}
    }
  }, data);
  assert.deepEqual(Object.keys(state.responses), ["s01"]);
  assert.equal(state.responses.s01.note.length, 500);
  assert.equal(state.responses.s01.before, null);
  assert.equal(state.responses.s01.after, 3);
});
test("reported practice cannot be imported without a selected option", () => {
  const state = core.normalizeState({version:1,responses:{s01:{option:99,practiced:true}}},data);
  assert.equal(state.responses.s01, undefined);
});
test("recommendations prefer unexplored, then unpracticed situations", () => {
  let s = core.freshState();
  assert.equal(core.nextScenario(s, data, "5-7").id, "s01");
  s = core.answer(s,"s01",0,data);
  assert.equal(core.nextScenario(s, data, "5-7").id, "s02");
  for (const id of ["s02","s03","s04"]) s=core.answer(s,id,0,data);
  assert.equal(core.nextScenario(s, data, "5-7").id, "s01");
  s=core.practice(s,"s01",{practiced:true},data);
  assert.equal(core.nextScenario(s, data, "5-7").id, "s02");
});
test("export can be imported without losing responses", () => {
  const original = core.answer(core.freshState(),"s09",0,data);
  const restored = core.normalizeState(JSON.parse(core.safeJSON(original,data)),data);
  assert.equal(restored.responses.s09.option,0);
});
test("app does not contain network sends or unsafe HTML rendering", () => {
  const app=fs.readFileSync(path.join(__dirname,"app.js"),"utf8");
  assert.doesNotMatch(app, /\bfetch\s*\(|\bXMLHttpRequest\b|\.innerHTML\s*=/);
  assert.match(app, /textContent/);
  const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /localStorage/);
});
