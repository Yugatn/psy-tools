const test=require("node:test");
const assert=require("node:assert/strict");
const M=require("../wheel/nine-streams/model.js");
test("девять потоков совпадают с каноническим порядком",()=>{
 assert.equal(M.STREAMS.length,9);
 assert.deepEqual(M.STREAMS.map(s=>s.name),["Зрение","Слух","Обоняние","Вкус","Осязание","Проприоцепция","Равновесие","Интероцепция","Социальная сопричастность"]);
 assert.equal(M.STREAMS[8].id,"F9");
});
test("27 координат, никакой автоматической оценки субъектов",()=>{
 const state=M.emptyState();
 assert.equal(Object.keys(state.entries).length,0);
 assert.equal(M.summary(M.blankCell(),"human").mean,null);
 assert.equal(M.summary(M.blankCell(),"human").unknown,9);
 const keys=new Set();
 for(const o of M.AXES.organism)for(const e of M.AXES.environment)for(const s of M.AXES.slice)keys.add(M.key(o.id,e.id,s.id));
 assert.equal(keys.size,27);
 assert.equal(M.key("alien","regular","s1"),null);
});
test("0/10 не равен пропуску; оценки только для человека и присутствующего канала",()=>{
 let cell=M.blankCell();cell.streams[0]={status:"present",comfort:0};
 cell.streams[1]={status:"present",comfort:10};
 let human=M.normalizeCell(cell,"human");
 assert.equal(M.summary(human,"human").rated,2);
 assert.equal(M.summary(human,"human").mean,5);
 assert.equal(human.streams[0].comfort,0);
 assert.equal(M.normalizeCell(cell,"bat").streams[0].comfort,null);
 cell.streams[0].status="absent";
 assert.equal(M.normalizeCell(cell,"human").streams[0].comfort,null);
});
test("unknown, absent, na остаются раздельными при импорте",()=>{
 const cell=M.blankCell();
 cell.streams[0].status="unknown";cell.streams[1].status="absent";cell.streams[2].status="na";
 cell.streams[3].status="present";cell.streams[3].comfort=7;
 let s=M.putCell(M.emptyState(),"human","dark","s2",cell);
 assert.equal(M.summary(M.getCell(s,"human","dark","s2"),"human").unknown,6);
 assert.equal(M.summary(M.getCell(s,"human","dark","s2"),"human").absent,1);
 assert.equal(M.summary(M.getCell(s,"human","dark","s2"),"human").notApplicable,1);
 assert.deepEqual(M.parse(JSON.stringify(s)).entries["human|dark|s2"].streams[3],{status:"present",comfort:7});
});
test("изолированы ячейки, текст ограничен, импорт не создаёт посторонних координат",()=>{
 let cell=M.blankCell();cell.note="x".repeat(2500);cell.evidence="<img src=x onerror=alert(1)>";
 cell.streams[0]={status:"present",comfort:15};
 let s=M.putCell(M.emptyState(),"human","regular","s1",cell);
 assert.equal(s.entries["human|regular|s1"].note.length,1200);
 assert.equal(s.entries["human|regular|s1"].streams[0].comfort,null);
 assert.equal(M.getCell(s,"human","regular","s2").note,"");
 const payload={schema:M.SCHEMA,version:M.VERSION,entries:{"human|regular|s1":s.entries["human|regular|s1"],"alien|dark|s1":{note:"injected"}}};
 const out=M.normalizeState(payload);
 assert.equal(Object.keys(out.entries).length,1);
 assert.equal(out.entries["human|regular|s1"].evidence,"<img src=x onerror=alert(1)>");
});
test("испорченная и чужая схема отвергаются",()=>{
 for(const data of ["[]","{}","null",JSON.stringify({schema:M.SCHEMA,version:2,entries:{}})]) assert.throws(()=>M.parse(data));
});
