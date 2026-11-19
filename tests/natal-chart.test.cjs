const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../mini-apps/natal-chart/chart.js");
const Astronomy = require("../mini-apps/natal-chart/vendor/astronomy.browser.min.js");

const example = {
  date:"2000-01-01",time:"12:00",utcOffset:"+00:00",
  latitude:51.4779,longitude:0,place:"Гринвич"
};
test("Astronomy Engine provides geocentric positions",()=>{
  assert.equal(typeof Astronomy.GeoVector,"function");
  assert.equal(typeof Astronomy.Ecliptic,"function");
  assert.equal(typeof Astronomy.SiderealTime,"function");
});
test("J2000 benchmark: Sun and Moon, all ten bodies",()=>{
  const r=C.calculate(example,Astronomy);
  assert.equal(r.points.length,10);
  assert.ok(Math.abs(r.points.find(p=>p.id==="Sun").longitude-280.368739)<0.02);
  assert.ok(Math.abs(r.points.find(p=>p.id==="Moon").longitude-223.323891)<0.02);
  assert.ok(r.points.every(p=>Number.isFinite(p.longitude)&&p.longitude>=0&&p.longitude<360));
  assert.ok(r.points.every(p=>p.signIndex>=0&&p.signIndex<12&&p.degree>=0&&p.degree<30));
});
test("UTC offset interpreted as historical fixed offset, not current timezone",()=>{
  const r=C.inputMoment({...example,utcOffset:"+05:45",time:"09:30"});
  assert.equal(r.utcISO,"2000-01-01T03:45:00.000Z");
  const earlier=C.inputMoment({...example,utcOffset:"-03:30",time:"22:00"});
  assert.equal(earlier.utcISO,"2000-01-02T01:30:00.000Z");
});
test("invalid date, UTC offset, time, coordinates are rejected",()=>{
  for(const date of ["2023-02-29","2000-13-01","1899-12-31","2101-01-01",""]){
    assert.throws(()=>C.calculate({...example,date},Astronomy));
  }
  for(const utcOffset of ["+15:00","-13:00","03:00","+14:30",""]){
    assert.throws(()=>C.calculate({...example,utcOffset},Astronomy));
  }
  for(const time of ["25:00","12:60",""]){
    assert.throws(()=>C.calculate({...example,time},Astronomy));
  }
  assert.throws(()=>C.calculate({...example,latitude:90},Astronomy));
  assert.throws(()=>C.calculate({...example,longitude:-181},Astronomy));
  assert.doesNotThrow(()=>C.calculate({...example,date:"2000-02-29"},Astronomy));
});
test("unknown birth time yields noon UTC without inventing ASC/houses",()=>{
  const r=C.calculate({date:"2000-01-01",unknownTime:true},Astronomy);
  assert.equal(r.angles,null);
  assert.equal(r.houses,"unknown");
  assert.ok(r.points.every(p=>p.house===undefined));
  assert.equal(r.moment.utcISO,"2000-01-01T12:00:00.000Z");
});
test("ASC, MC and twelve equal house cusps remain distinct",()=>{
  const r=C.calculate(example,Astronomy);
  assert.ok(Math.abs(r.angles.asc.longitude-24.268448)<0.1);
  assert.ok(Math.abs(r.angles.mc.longitude-279.610947)<0.1);
  assert.equal(r.angles.houseCusps.length,12);
  assert.ok(r.angles.houseCusps.every((p,i)=>Math.abs(C.angleDelta(p.longitude,r.angles.asc.longitude+i*30))<1e-8));
  assert.ok(r.points.every(p=>p.house>=1&&p.house<=12));
  assert.notEqual(Math.round(r.angles.houseCusps[9].longitude),Math.round(r.angles.mc.longitude));
});
test("ascendant is eastern intersection of ecliptic and horizon",()=>{
  const r=C.calculate(example,Astronomy);
  const th=r.angles.lst*Math.PI/180,phi=r.moment.latitude*Math.PI/180,eps=r.angles.eps*Math.PI/180;
  const lam=r.angles.asc.longitude*Math.PI/180;
  const x=Math.cos(lam),y=Math.sin(lam)*Math.cos(eps),z=Math.sin(lam)*Math.sin(eps);
  const up=Math.sin(phi)*z+Math.cos(phi)*(x*Math.cos(th)+y*Math.sin(th));
  const east=-x*Math.sin(th)+y*Math.cos(th);
  assert.ok(Math.abs(up)<1e-10);
  assert.ok(east>0);
});
test("aspects are within declared orb ranges and normalized",()=>{
  const r=C.calculate(example,Astronomy);
  assert.ok(r.aspects.length>0);
  assert.ok(r.aspects.every(a=>a.orb<=C.ASPECTS.find(x=>x.id===a.type).orb));
  assert.equal(C.separation(359,1),2);
  assert.equal(C.norm(-10),350);
});
test("text export is transparent about time, houses and no predictive proof",()=>{
  const r=C.calculate(example,Astronomy);
  const txt=C.textSummary(r);
  assert.match(txt,/Натальная карта/);
  assert.match(txt,/ASC/);
  assert.match(txt,/не имеют научной/);
  const unknown=C.textSummary(C.calculate({date:"2000-01-01",unknownTime:true},Astronomy));
  assert.doesNotMatch(unknown,/ASC:/);
  assert.match(unknown,/время неизвестно/);
});
