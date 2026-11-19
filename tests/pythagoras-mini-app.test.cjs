const test=require("node:test");
const assert=require("node:assert/strict");
const C=require("../mini-apps/pythagoras/calculator.js");

test("пример 14.03.1992: 29 / 11 / 27 / 9",()=>{
 const r=C.calculate("14.03.1992");
 assert.deepEqual(r.working,[29,11,27,9]);
 assert.deepEqual(r.counts,{1:4,2:3,3:1,4:1,5:0,6:0,7:1,8:0,9:4});
 assert.equal(r.nonZeroTotal,14);
 assert.deepEqual(r.layout.map(row=>row.map(v=>v.digit)),[[1,4,7],[2,5,8],[3,6,9]]);
 assert.equal(r.lines.length,8);
 assert.deepEqual(r.lines.map(x=>x.count),[6,3,5,8,1,5,8,2]);
});
test("дата принимает ISO и русскую запись без потери ведущего нуля",()=>{
 const a=C.calculate("03.09.2001"),b=C.calculate("2001-09-03");
 assert.deepEqual(a,b);
 assert.equal(a.date.dd,"03");
 assert.equal(a.date.display,"03.09.2001");
});
test("правило для 01–09 выбирается явно",()=>{
 const sig=C.calculate("03.09.2001");
 const literal=C.calculate("03.09.2001",{firstDayRule:"literal"});
 assert.deepEqual(sig.working,[15,6,9,9]);
 assert.deepEqual(literal.working,[15,6,15,6]);
 assert.notDeepEqual(sig.counts,literal.counts);
});
test("проверка реальных календарных дат, включая високосные века",()=>{
 for(const v of ["29.02.1900","31.04.2023","32.01.2020","00.01.2000","31.13.2020","1.1.2000","","2024-01-00"])assert.throws(()=>C.calculate(v));
 for(const v of ["29.02.2000","29.02.2024","01.01.1900","31.12.2099"])assert.doesNotThrow(()=>C.calculate(v));
});
test("второе рабочее число — одна сумма цифр, не цифровой корень",()=>{
 assert.equal(C.calculate("14.03.1992").working[1],11);
});
test("нулевые символические позиции корректны и не подменяются диагнозом",()=>{
 const r=C.calculate("14.03.1992");
 assert.equal(r.counts[5],0);assert.equal(r.layout[1][1].symbols,"");
 assert.ok(C.formatText(r).includes("Нумерологическая символическая система"));
});
test("восемь линий считаются только по собственным цифрам",()=>{
 const r=C.calculate("14.03.1992");
 for(const l of r.lines) assert.equal(l.count,l.digits.reduce((sum,n)=>sum+r.counts[n],0));
});
test("форматирование результата содержит дату и матрицу",()=>{
 const text=C.formatText(C.calculate("14.03.1992"));
 assert.match(text,/14\.03\.1992/);
 assert.match(text,/29 · 11 · 27 · 9/);
 assert.match(text,/1111/);
 assert.match(text,/не психологическая диагностика/);
});

test("each cell transparently separates date digits and working digits",()=>{
 const r=C.calculate("14.03.1992");
 for(let d=1;d<=9;d++) assert.equal(r.counts[d],r.dateCounts[d]+r.workingCounts[d]);
 assert.equal(r.dateCounts[1],2);
 assert.equal(r.workingCounts[1],2);
 assert.equal(r.excludedZeros,1);
 assert.equal(r.nonZeroTotal,Object.values(r.dateCounts).reduce((a,b)=>a+b,0)+Object.values(r.workingCounts).reduce((a,b)=>a+b,0));
});
test("explicitly compares competing leading-zero conventions",()=>{
 const two=C.compareRules("03.09.2001");
 assert.equal(two.changed,true);
 assert.deepEqual(two.significant.working,[15,6,9,9]);
 assert.deepEqual(two.literal.working,[15,6,15,6]);
 assert.equal(two.changes.length,9);
 assert.ok(two.changes.some(x=>x.difference!==0));
 assert.equal(C.compareRules("14.03.1992").changed,false);
});
test("formatted export states rule and origin counts",()=>{
 const txt=C.formatText(C.calculate("14.03.1992"));
 assert.match(txt,/Правило для дней 01–09:/);
 assert.match(txt,/Источники цифр:/);
 assert.match(txt,/не психологическая диагностика/);
});
