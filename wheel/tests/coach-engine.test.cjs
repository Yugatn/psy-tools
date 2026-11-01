"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const coach=require("../coach-engine.js");

class MemoryStorage {
  constructor(initial={}){this.data=new Map(Object.entries(initial));}
  get length(){return this.data.size;}
  key(i){return [...this.data.keys()][i]??null;}
  getItem(key){return this.data.get(key)??null;}
  setItem(key,value){this.data.set(key,String(value));}
}
const baseKey="wheelBalanceV3Values";
const nestedKey="wheelNestedV2_health_Values";

test("catalogue matches 13 existing wheel routes and names",()=>{
  assert.equal(coach.catalog.length,13);
  const ids=new Set(coach.catalog.map(x=>x.id));
  assert.equal(ids.size,13);
  for(const entry of coach.catalog){
    assert.ok(entry.rays.length>=8 && entry.rays.length<=12);
    assert.ok(entry.rays.every(x=>typeof x==="string"&&x.length>1));
  }
  assert.equal(coach.catalog.find(x=>x.id==="main").rays[6],"Отдых и восстановление");
});

test("missing, invalid, or dangerous score is NOT zero",()=>{
  for(const invalid of [null,undefined,""," ",false,true,-1,11,Infinity,NaN,{},[],"NaN"]){
    assert.equal(coach.score(invalid),null,String(invalid));
  }
  assert.equal(coach.score(0),0);
  assert.equal(coach.score("0"),0);
  assert.equal(coach.score(10),10);
});

test("one browser profile only sees its own stored wheel scores",()=>{
  const a=new MemoryStorage({[baseKey]:JSON.stringify([0,null,3,null,null,null,null,null,null])});
  const b=new MemoryStorage();
  const aa=coach.readList(a),bb=coach.readList(b);
  assert.equal(aa.length,1);
  assert.equal(aa[0].rays[0].score,0);
  assert.equal(aa[0].rays[1].score,null);
  assert.equal(bb.length,0);
});

test("nested and detail wheels retain isolated storage and context",()=>{
  const detail="wheelBalanceDetail:"+encodeURIComponent("health:Сон / Регулярность")+":values";
  const storage=new MemoryStorage({
    [nestedKey]:JSON.stringify([null,6,null,null,null,null,null,null]),
    [detail]:JSON.stringify([0,null,null,null,null,null,null,null]),
    wheelBalanceV3Values:"[broken JSON]",
    "otherApp:key":"[9]"
  });
  const result=coach.readList(storage);
  assert.equal(result.length,2);
  const d=result.find(x=>x.key===detail);
  assert.match(d.title,/Регулярность/);
  assert.equal(d.rays[0].score,0);
  assert.equal(coach.improvementsKey(detail),detail.replace(/:values$/,":improvements"));
  assert.equal(coach.improvementsKey(nestedKey),"wheelNestedV2_health_Improvements");
  assert.equal(coach.improvementsKey(baseKey),"wheelBalanceV3Improvements");
  assert.equal(coach.improvementsKey("otherApp:key"),null);
});

test("no score means no invented assessment",()=>{
  const storage=new MemoryStorage({[baseKey]:JSON.stringify(Array(9).fill(null))});
  assert.equal(coach.readList(storage).length,0);
});

for(const mode of ["reflection","reframe","coaching"]){
  test("mode "+mode+" follows a non-directive bounded dialogue, skipping allowed",()=>{
    const source=coach.readList(new MemoryStorage({[baseKey]:JSON.stringify([3,null,0,null,null,null,null,null,null])}))[0];
    let s=coach.begin(source,0,mode);
    const expected=mode==="coaching"?6:5;
    assert.equal(s.stage,0);
    assert.ok(coach.prompt(s));
    assert.throws(()=>coach.answer(s,""),/от 1 до 2000/);
    assert.throws(()=>coach.answer(s,"x".repeat(2001)),/от 1 до 2000/);
    assert.throws(()=>coach.summary(s),/не завершена/);
    for(let i=0;i<expected;i++)s=i===1?coach.skip(s):coach.answer(s,"Мой ответ №"+i);
    assert.equal(coach.complete(s),true);
    assert.equal(coach.prompt(s),null);
    assert.equal(s.answers.length,expected);
    assert.equal(s.answers[1],null);
    assert.match(coach.summary(s),/Пропущено/);
    assert.match(coach.summary(s),/Мой ответ №0/);
    assert.throws(()=>coach.answer(s,"ещё"),/завершена/);
  });
}
test("safe source text stays text: engine never generates HTML or diagnosis",()=>{
  const source=coach.readList(new MemoryStorage({[baseKey]:JSON.stringify([2,null,null,null,null,null,null,null,null])}))[0];
  let s=coach.begin(source,0,"reflection");
  s=coach.answer(s,"<img src=x onerror=alert(1)>");
  while(coach.prompt(s))s=coach.skip(s);
  assert.match(coach.summary(s),/<img src=x onerror=alert\(1\)>/);
  assert.match(coach.summary(s),/самостоятельно/);
});

test("unknown mode and unknown ray are rejected",()=>{
 const x=coach.readList(new MemoryStorage({[baseKey]:JSON.stringify([5,null,null,null,null,null,null,null,null])}))[0];
 assert.throws(()=>coach.begin(x,100,"coaching"),/Недопустимый/);
 assert.throws(()=>coach.begin(x,0,"therapy"),/Недопустимый/);
});
