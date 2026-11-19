const test=require("node:test");
const assert=require("node:assert/strict");
const TZ=require("../mini-apps/natal-chart/timezones.js");
const C=require("../mini-apps/natal-chart/chart.js");
const Astronomy=require("../mini-apps/natal-chart/vendor/astronomy.browser.min.js");
const location={latitude:53.9,longitude:27.56667,place:"Минск"};

test("Belarus uses IANA Europe/Minsk with historical winter and summer offsets",()=>{
 const jan=TZ.resolve("2010-01-15","12:00","Europe/Minsk");
 const jul=TZ.resolve("2010-07-15","12:00","Europe/Minsk");
 const now=TZ.resolve("2020-01-15","12:00","Europe/Minsk");
 assert.equal(jan.status,"unique");
 assert.equal(jul.status,"unique");
 assert.equal(now.status,"unique");
 assert.equal(jan.candidates[0].offset,"+02:00");
 assert.equal(jul.candidates[0].offset,"+03:00");
 assert.equal(now.candidates[0].offset,"+03:00");
 assert.equal(jan.candidates[0].utcISO,"2010-01-15T10:00:00.000Z");
});

test("nonexistent local time is rejected, not shifted silently",()=>{
 for(const [date,time,zone] of [
  ["2010-03-28","02:30","Europe/Minsk"],
  ["2020-03-29","02:30","Europe/Stockholm"]
 ]){
  const r=TZ.resolve(date,time,zone);
  assert.equal(r.status,"gap");
  assert.equal(r.candidates.length,0);
 }
});

test("repeated clock hour gives two distinct UTC moments",()=>{
 const by=TZ.resolve("2010-10-31","02:30","Europe/Minsk");
 assert.equal(by.status,"ambiguous");
 assert.equal(by.candidates.length,2);
 assert.deepEqual(by.candidates.map(c=>c.offset),["+03:00","+02:00"]);
 assert.equal(by.candidates[1].utcMs-by.candidates[0].utcMs,3600000);
 const se=TZ.resolve("2020-10-25","02:30","Europe/Stockholm");
 assert.equal(se.status,"ambiguous");
 assert.deepEqual(se.candidates.map(c=>c.offset),["+02:00","+01:00"]);
});

test("Moscow administrative transition can repeat an hour",()=>{
 const r=TZ.resolve("2014-10-26","01:30","Europe/Moscow");
 assert.equal(r.status,"ambiguous");
 assert.deepEqual(r.candidates.map(c=>c.offset),["+04:00","+03:00"]);
});

test("input validation never silently falls back to machine timezone",()=>{
 assert.throws(()=>TZ.resolve("2020-01-01","12:00",""));
 assert.throws(()=>TZ.resolve("2020-01-01","12:00","America/Los_Angeles"));
 assert.throws(()=>TZ.resolve("2023-02-29","12:00","Europe/Minsk"));
 assert.throws(()=>TZ.resolve("2020-01-01","25:01","Europe/Minsk"));
 assert.equal(TZ.formatOffset(3*3600+15),"+03:00:15");
 assert.equal(TZ.formatOffset(-90*60),"-01:30");
});

test("historical zone result can drive natal chart without rounding seconds",()=>{
 const r=TZ.resolve("2010-10-31","02:30","Europe/Minsk");
 for(const c of r.candidates){
  const input={date:"2010-10-31",time:"02:30",utcOffsetSeconds:c.offsetSeconds,
    timeZone:r.zone,...location};
  const chart=C.calculate(input,Astronomy);
  assert.equal(chart.moment.utcISO,c.utcISO);
  assert.equal(chart.moment.timeZone,"Europe/Minsk");
  assert.ok(chart.angles && chart.points.length===10);
  assert.match(C.textSummary(chart),/Europe\/Minsk/);
 }
});

test("manual UTC offset mode remains backwards compatible",()=>{
 const r=C.calculate({date:"2000-01-01",time:"12:00",utcOffset:"+00:00",
   latitude:51.4779,longitude:0},Astronomy);
 assert.equal(r.moment.utcISO,"2000-01-01T12:00:00.000Z");
 assert.equal(r.moment.offsetSeconds,0);
 assert.equal(r.moment.timeZone,null);
 assert.match(C.textSummary(r),/UTC\+00:00/);
});

test("unknown birth time does not infer an ASC but bounds Moon range",()=>{
 const chart=C.calculate({date:"2000-01-01",unknownTime:true},Astronomy);
 assert.equal(chart.angles,null);
 assert.ok(chart.moonRange);
 assert.ok(chart.moonRange.start.longitude>=0&&chart.moonRange.start.longitude<360);
 assert.ok(chart.moonRange.end.longitude>=0&&chart.moonRange.end.longitude<360);
 assert.match(C.textSummary(chart),/00–24 UTC/);
 assert.doesNotMatch(C.textSummary(chart),/ASC:/);
});

test("second-precision historical offsets are faithfully preserved in UTC",()=>{
 const r=TZ.resolve("1900-01-15","12:00","Europe/Minsk");
 assert.equal(r.status,"unique");
 const c=r.candidates[0];
 const result=C.calculate({date:"1900-01-15",time:"12:00",...location,
  utcOffsetSeconds:c.offsetSeconds,timeZone:"Europe/Minsk"},Astronomy);
 assert.equal(result.moment.utcISO,c.utcISO);
 assert.ok(result.moment.offsetSeconds===c.offsetSeconds);
 assert.ok(c.utcISO.endsWith("Z"));
});

test("no server-side timeZone service required",()=>{
 assert.ok(TZ.ZONES.some(z=>z.id==="Europe/Minsk"));
 assert.ok(TZ.ZONES.some(z=>z.id==="Europe/Moscow"));
 assert.ok(TZ.ZONES.some(z=>z.id==="Asia/Yakutsk"));
});
