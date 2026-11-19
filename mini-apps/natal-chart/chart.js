/* PSY-TOOLS Natal Chart 1.0 — Astronomy Engine 2.1.19
 * Astronomical calculations, separate from unsupported astrological predictions.
 * Geographic coordinates and historical UTC offset entered explicitly.
 * Tropical geocentric ecliptic of date, equal 30° houses, approximate ASC/MC.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.NatalChartEngine=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
 "use strict";
 const VERSION="1.0.0";
 const SIGN_NAMES=["Овен","Телец","Близнецы","Рак","Лев","Дева","Весы","Скорпион","Стрелец","Козерог","Водолей","Рыбы"];
 const SIGN_SYMBOLS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
 const BODIES=Object.freeze([
  {id:"Sun",ru:"Солнце",symbol:"☉"},{id:"Moon",ru:"Луна",symbol:"☽"},
  {id:"Mercury",ru:"Меркурий",symbol:"☿"},{id:"Venus",ru:"Венера",symbol:"♀"},
  {id:"Mars",ru:"Марс",symbol:"♂"},{id:"Jupiter",ru:"Юпитер",symbol:"♃"},
  {id:"Saturn",ru:"Сатурн",symbol:"♄"},{id:"Uranus",ru:"Уран",symbol:"♅"},
  {id:"Neptune",ru:"Нептун",symbol:"♆"},{id:"Pluto",ru:"Плутон",symbol:"♇"}
 ]);
 const ASPECTS=Object.freeze([
  {id:"conjunction",name:"Соединение",angle:0,orb:8,symbol:"☌"},
  {id:"sextile",name:"Секстиль",angle:60,orb:5,symbol:"⚹"},
  {id:"square",name:"Квадрат",angle:90,orb:6,symbol:"□"},
  {id:"trine",name:"Тригон",angle:120,orb:6,symbol:"△"},
  {id:"opposition",name:"Оппозиция",angle:180,orb:8,symbol:"☍"}
 ]);
 function norm(deg){return ((deg%360)+360)%360;}
 function separation(a,b){const d=Math.abs(norm(a)-norm(b));return Math.min(d,360-d);}
 function angleDelta(a,b){return ((a-b+540)%360)-180;}
 function parseDate(s){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));
  if(!m)throw new Error("Укажите дату рождения.");
  const year=+m[1],month=+m[2],day=+m[3];
  if(year<1900||year>2100)throw new Error("Поддерживаются даты 1900–2100 (вне диапазона нужна отдельная проверка эфемерид).");
  const t=new Date(Date.UTC(year,month-1,day,12));
  if(t.getUTCFullYear()!==year||t.getUTCMonth()!==month-1||t.getUTCDate()!==day)throw new Error("Несуществующая календарная дата.");
  return {year,month,day,iso:s};
 }
 function parseTime(s){
  const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s||""));
  if(!m)throw new Error("Время должно быть в формате ЧЧ:ММ (00:00–23:59).");
  return {hour:+m[1],minute:+m[2]};
 }
 function parseOffset(s){
  const m=/^([+-])(0\d|1[0-4]):([0-5]\d)$/.exec(String(s||""));
  if(!m)throw new Error("Укажите UTC-смещение в формате +03:00 или -05:30.");
  let min=(+m[2])*60+(+m[3]);
  if(min>14*60||(m[1]==="-"&&min>12*60)||(m[2]==="14"&&+m[3]!==0))throw new Error("UTC-смещение вне диапазона −12:00…+14:00.");
  return (m[1]==="-"?-1:1)*min;
 }
 function coord(v,min,max,name){
  if(v===undefined||v===null||String(v).trim()==="")throw new Error("Укажите "+name+".");
  const n=typeof v==="number"?v:Number(String(v).replace(",","."));
  if(!Number.isFinite(n)||n<min||n>max)throw new Error("Некорректная координата: "+name+".");
  return n;
 }
 function inputMoment(input){
  if(!input||typeof input!=="object")throw new Error("Нет исходных данных.");
  const date=parseDate(input.date), unknown=Boolean(input.unknownTime);
  let hour=12,minute=0,offsetMinutes=null,lat=null,lon=null,place="";
  if(!unknown){
    const tm=parseTime(input.time);hour=tm.hour;minute=tm.minute;
    offsetMinutes=parseOffset(input.utcOffset);
    lat=coord(input.latitude,-89,89,"широту");
    lon=coord(input.longitude,-180,180,"долготу");
    place=typeof input.place==="string"?input.place.trim().slice(0,100):"";
  }
  const utcMs=Date.UTC(date.year,date.month-1,date.day,hour,minute)-((offsetMinutes||0)*60000);
  const utc=new Date(utcMs);
  if(!Number.isFinite(utcMs))throw new Error("Не удалось вычислить UTC.");
  return {date,unknown,hour,minute,offsetMinutes,latitude:lat,longitude:lon,place,utc,utcISO:utc.toISOString()};
 }
 function epsilonDegrees(utc){
  // Meeus: mean obliquity; apparent sidereal time introduces <0.01° mismatch.
  const jd=utc.getTime()/86400000+2440587.5;
  const T=(jd-2451545)/36525;
  return 23.439291111-0.013004167*T-1.63889e-7*T*T+5.03611e-7*T*T*T;
 }
 function ascendantFromLST(lstDeg,latitudeDeg,epsDeg){
  const th=norm(lstDeg)*Math.PI/180,phi=latitudeDeg*Math.PI/180,eps=epsDeg*Math.PI/180;
  const a=Math.cos(phi)*Math.cos(th);
  const b=Math.sin(phi)*Math.sin(eps)+Math.cos(phi)*Math.cos(eps)*Math.sin(th);
  let lambda=norm(Math.atan2(-a,b)*180/Math.PI);
  // Rising (eastern) ecliptic/horizon intersection, not the setting point.
  const east=-Math.cos(lambda*Math.PI/180)*Math.sin(th)+Math.sin(lambda*Math.PI/180)*Math.cos(eps)*Math.cos(th);
  if(east<0)lambda=norm(lambda+180);
  return lambda;
 }
 function midheavenFromLST(lstDeg,epsDeg){
  const th=norm(lstDeg)*Math.PI/180;
  return norm(Math.atan2(Math.sin(th)/Math.cos(epsDeg*Math.PI/180),Math.cos(th))*180/Math.PI);
 }
 function position(lon){
  const x=norm(lon),n=Math.floor(x/30),deg=x%30;
  return {longitude:x,signIndex:n,sign:SIGN_NAMES[n],signSymbol:SIGN_SYMBOLS[n],degree:deg};
 }
 function formatDegree(v){const deg=Math.floor(v),minute=Math.round((v-deg)*60);return String(deg+(minute===60?1:0)).padStart(2,"0")+"°"+String(minute===60?0:minute).padStart(2,"0")+"′";}
 function bodyPosition(astro,body,utc){
  const vec=astro.GeoVector(body,utc,true);
  const p=astro.Ecliptic(vec);
  if(!p||!Number.isFinite(p.elon)||!Number.isFinite(p.elat))throw new Error("Эфемерида не вернула координаты: "+body);
  return {longitude:norm(p.elon),latitude:p.elat};
 }
 function calculate(input,astro){
  if(!astro||typeof astro.GeoVector!=="function"||typeof astro.Ecliptic!=="function"||typeof astro.SiderealTime!=="function")throw new Error("Астрономическая библиотека Astronomy Engine не загружена.");
  const moment=inputMoment(input);
  const utc=moment.utc;
  const points=BODIES.map(b=>{
    const pos=bodyPosition(astro,b.id,utc);
    const before=bodyPosition(astro,b.id,new Date(utc.getTime()-12*3600000));
    const after=bodyPosition(astro,b.id,new Date(utc.getTime()+12*3600000));
    const dailyMotion=angleDelta(after.longitude,before.longitude);
    const retrograde=dailyMotion<-0.01;
    return {...b,...pos,...position(pos.longitude),dailyMotion,retrograde};
  });
  let angles=null;
  if(!moment.unknown){
    const lst=norm(astro.SiderealTime(utc)*15+moment.longitude);
    const eps=epsilonDegrees(utc);
    const asc=ascendantFromLST(lst,moment.latitude,eps);
    const mc=midheavenFromLST(lst,eps);
    angles={asc:position(asc),mc:position(mc),lst,eps,
      houseCusps:Array.from({length:12},(_,i)=>({number:i+1,...position(asc+i*30)})),
      system:"Equal house (ASC as 1st cusp; MC separate)"};
    points.forEach(p=>{p.house=Math.floor(norm(p.longitude-asc)/30)+1;});
  }
  const aspects=[];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const sep=separation(points[i].longitude,points[j].longitude);
    const choices=ASPECTS.map(a=>({...a,difference:Math.abs(sep-a.angle)})).filter(a=>a.difference<=a.orb);
    if(choices.length) {
      choices.sort((a,b)=>a.difference-b.difference);
      const a=choices[0];
      aspects.push({from:points[i].id,to:points[j].id,fromName:points[i].ru,toName:points[j].ru,
        type:a.id,name:a.name,symbol:a.symbol,angle:a.angle,orb:a.difference,separation:sep});
    }
  }
  aspects.sort((a,b)=>a.orb-b.orb);
  return {version:VERSION,zodiac:"tropical",frame:"geocentric apparent ecliptic of date",
   houses:angles?"equal":"unknown",moment:moment,points,angles,aspects,
   note:moment.unknown?"Время неизвестно: положение планет для 12:00 UTC; ASC и дома не рассчитываются; Луна может измениться за день.":"Точность углов и домов зависит от указанного времени, UTC-смещения и координат. Домовая система — равнодомная."};
 }
 function textSummary(r){
  const header=["Натальная карта (астрономические положения, тропический зодиак)",
    "Дата: "+r.moment.date.iso+(r.moment.unknown?" (время неизвестно, 12:00 UTC)":" "+String(r.moment.hour).padStart(2,"0")+":"+String(r.moment.minute).padStart(2,"0")+" UTC"+(r.moment.offsetMinutes>=0?"+":"−")+Math.floor(Math.abs(r.moment.offsetMinutes)/60).toString().padStart(2,"0")+":"+String(Math.abs(r.moment.offsetMinutes)%60).padStart(2,"0")),
    "UTC: "+r.moment.utcISO];
  if(r.angles)header.push("ASC: "+r.angles.asc.sign+" "+formatDegree(r.angles.asc.degree)+"; MC: "+r.angles.mc.sign+" "+formatDegree(r.angles.mc.degree));
  for(const p of r.points)header.push(p.ru+": "+p.sign+" "+formatDegree(p.degree)+(p.house?" / дом "+p.house:"")+(p.retrograde?" (R)":""));
  header.push("Астрономия — расчёт положений; астрологические трактовки не имеют научной прогностической валидации.");
  return header.join("\n");
 }
 return Object.freeze({VERSION,SIGN_NAMES,SIGN_SYMBOLS,BODIES,ASPECTS,norm,separation,angleDelta,parseDate,parseTime,parseOffset,inputMoment,
    epsilonDegrees,ascendantFromLST,midheavenFromLST,position,formatDegree,calculate,textSummary});
});
