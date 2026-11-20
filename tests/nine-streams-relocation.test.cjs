"use strict";
/** Regression: nine-streams research relocation preserves the author model and visitor data. */
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("модель живёт только в исследованиях, канон и localStorage совместимы",()=>{
  const M=require("../research/nine-streams/model.js");
  assert.equal(M.STORAGE_KEY,"psy-tools.nine-streams.v1");
  assert.equal(M.VERSION,1);
  assert.equal(M.STREAMS.length,9);
  assert.equal(M.AXES.organism.length*M.AXES.environment.length*M.AXES.slice.length,27);
  assert.ok(!fs.existsSync(path.join(root,"wheel/nine-streams/model.js")),"old duplicate should be removed");
});
test("новый интерфейс загружает единственную исследовательскую модель",()=>{
  const html=read("research/nine-streams/index.html");
  assert.match(html,/src="\.\/model\.js"/);
  assert.match(html,/href="\.\.\/"/);
  assert.match(html,/https:\/\/yugatn\.github\.io\/psy-tools\/research\/nine-streams\//);
  assert.doesNotMatch(html,/wheel-nav\.js/);
  for(const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
test("старый адрес автоматически перенаправляет и сохраняет параметры ссылки",()=>{
  const html=read("wheel/nine-streams/index.html");
  assert.match(html,/location\.replace\("\/psy-tools\/research\/nine-streams\/"\+location\.search\+location\.hash\)/);
  assert.match(html,/rel="canonical"/);
  assert.doesNotMatch(html,/src="\.\/model\.js"/);
});
test("исследования содержат модуль; колёса и их меню его не содержат",()=>{
  assert.match(read("research/index.html"),/href="\.\/nine-streams\/"/);
  assert.match(read("index.html"),/href="\.\/research\/nine-streams\/"/);
  for(const p of ["wheel/hub.html","wheel/wheel-nav.js"]){
    const content=read(p);
    assert.doesNotMatch(content,/\bnine-streams\//,p+" should not list the research module");
  }
});
test("QA и CI учитывают новую структуру путей",()=>{
  const qa=read("wheel/qa.html");
  assert.doesNotMatch(qa,/path:"nine-streams\//);
  const workflow=read(".github/workflows/nine-streams-regression.yml");
  assert.match(workflow,/node --check research\/nine-streams\/model\.js/);
  assert.match(workflow,/node --test tests\/nine-streams\.test\.cjs/);
  assert.match(read("wheel/tests/qa-sanity.cjs"),/matchSpecs\.length,22/);
});
