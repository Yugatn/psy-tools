/* Historical civil time for Natal Chart — local time to UTC using browser IANA tzdb.
 * No network requests, no invented geographic timezone inference.
 * Local wall clock can be unique, repeated (fold) or nonexistent (DST gap).
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.NatalTimeZones=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
 "use strict";
 const VERSION="1.0.0";
 const ZONES=Object.freeze([
   {id:"Europe/Minsk",label:"Беларусь — Минск (Europe/Minsk)",country:"BY"},
   {id:"Europe/Kaliningrad",label:"Калининград (Europe/Kaliningrad)",country:"RU"},
   {id:"Europe/Moscow",label:"Москва и многие города западной России (Europe/Moscow)",country:"RU"},
   {id:"Europe/Kirov",label:"Киров (Europe/Kirov)",country:"RU"},
   {id:"Europe/Volgograd",label:"Волгоград (Europe/Volgograd)",country:"RU"},
   {id:"Europe/Saratov",label:"Саратов (Europe/Saratov)",country:"RU"},
   {id:"Europe/Ulyanovsk",label:"Ульяновск (Europe/Ulyanovsk)",country:"RU"},
   {id:"Europe/Samara",label:"Самара (Europe/Samara)",country:"RU"},
   {id:"Asia/Yekaterinburg",label:"Екатеринбург (Asia/Yekaterinburg)",country:"RU"},
   {id:"Asia/Omsk",label:"Омск (Asia/Omsk)",country:"RU"},
   {id:"Asia/Novosibirsk",label:"Новосибирск (Asia/Novosibirsk)",country:"RU"},
   {id:"Asia/Barnaul",label:"Барнаул (Asia/Barnaul)",country:"RU"},
   {id:"Asia/Tomsk",label:"Томск (Asia/Tomsk)",country:"RU"},
   {id:"Asia/Krasnoyarsk",label:"Красноярск (Asia/Krasnoyarsk)",country:"RU"},
   {id:"Asia/Irkutsk",label:"Иркутск (Asia/Irkutsk)",country:"RU"},
   {id:"Asia/Chita",label:"Чита (Asia/Chita)",country:"RU"},
   {id:"Asia/Yakutsk",label:"Якутск (Asia/Yakutsk)",country:"RU"},
   {id:"Asia/Khandyga",label:"Хандыга (Asia/Khandyga)",country:"RU"},
   {id:"Asia/Vladivostok",label:"Владивосток (Asia/Vladivostok)",country:"RU"},
   {id:"Asia/Ust-Nera",label:"Усть-Нера (Asia/Ust-Nera)",country:"RU"},
   {id:"Asia/Sakhalin",label:"Сахалин (Asia/Sakhalin)",country:"RU"},
   {id:"Asia/Magadan",label:"Магадан (Asia/Magadan)",country:"RU"},
   {id:"Asia/Srednekolymsk",label:"Среднеколымск (Asia/Srednekolymsk)",country:"RU"},
   {id:"Asia/Kamchatka",label:"Камчатка (Asia/Kamchatka)",country:"RU"},
   {id:"Asia/Anadyr",label:"Анадырь (Asia/Anadyr)",country:"RU"},
   {id:"Europe/London",label:"Лондон (Europe/London)",country:"OTHER"},
   {id:"Europe/Stockholm",label:"Стокгольм (Europe/Stockholm)",country:"OTHER"},
   {id:"Asia/Bangkok",label:"Бангкок (Asia/Bangkok)",country:"OTHER"},
   {id:"Asia/Ho_Chi_Minh",label:"Вьетнам (Asia/Ho_Chi_Minh)",country:"OTHER"},
   {id:"America/New_York",label:"Нью-Йорк (America/New_York)",country:"OTHER"},
   {id:"Etc/UTC",label:"Всемирное координированное время (UTC)",country:"OTHER"}
 ]);
 const allowed=new Set(ZONES.map(z=>z.id));
 function validateZone(zone){
  if(typeof zone!=="string"||!allowed.has(zone))throw Error("Выберите часовой пояс IANA из списка.");
  try{
    new Intl.DateTimeFormat("en-GB",{timeZone:zone}).format(new Date(0));
  }catch(e){throw Error("Браузер не поддерживает выбранную часовую зону; используйте ручной UTC-режим.");}
  return zone;
 }
 function parseWall(date,time){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||"");
  const h=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(time||"");
  if(!m||!h)throw Error("Для расчёта часового пояса укажите полную дату и время ЧЧ:ММ.");
  const y=+m[1],mo=+m[2],d=+m[3],hour=+h[1],minute=+h[2];
  if(y<1900||y>2100)throw Error("Поддерживаются даты 1900–2100.");
  const epoch=Date.UTC(y,mo-1,d,hour,minute);
  const t=new Date(epoch);
  if(t.getUTCFullYear()!==y||t.getUTCMonth()!==mo-1||t.getUTCDate()!==d)throw Error("Несуществующая дата.");
  return {year:y,month:mo,day:d,hour,minute,epoch};
 }
 function partsAt(utcMs,zone){
  const fmt=new Intl.DateTimeFormat("en-GB",{
    timeZone:zone,calendar:"gregory",numberingSystem:"latn",
    year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  });
  const found=Object.fromEntries(fmt.formatToParts(new Date(utcMs)).filter(p=>/^(year|month|day|hour|minute|second)$/.test(p.type)).map(p=>[p.type,Number(p.value)]));
  if(Object.values(found).some(v=>!Number.isInteger(v)))throw Error("Не удалось определить локальное время в часовом поясе.");
  return found;
 }
 function offsetSecondsAt(utcMs,zone){
  const p=partsAt(utcMs,zone);
  const localAsUTC=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  return Math.round((localAsUTC-utcMs)/1000);
 }
 function formatOffset(seconds){
  if(!Number.isInteger(seconds)||Math.abs(seconds)>14*3600)throw Error("Неверное UTC-смещение");
  const abs=Math.abs(seconds),h=String(Math.floor(abs/3600)).padStart(2,"0");
  const m=String(Math.floor(abs%3600/60)).padStart(2,"0"),s=abs%60;
  return (seconds<0?"-":"+")+h+":"+m+(s?":"+String(s).padStart(2,"0"):"");
 }
 function resolve(date,time,zone){
  validateZone(zone);
  const wall=parseWall(date,time);
  const offsets=new Set();
  // Sample 13 instants spanning ±36 hours to collect offsets on either side
  // of DST/administrative transitions; do not assume current UTC offset.
  for(let h=-36;h<=36;h+=6){
   const instant=wall.epoch+h*3600000;
   offsets.add(offsetSecondsAt(instant,zone));
  }
  const candidates=[];
  for(const seconds of offsets){
   const instant=wall.epoch-seconds*1000;
   const got=partsAt(instant,zone);
   if(got.year===wall.year&&got.month===wall.month&&got.day===wall.day&&got.hour===wall.hour&&got.minute===wall.minute){
    if(!candidates.some(c=>c.utcMs===instant))
     candidates.push({utcMs:instant,utcISO:new Date(instant).toISOString(),offsetSeconds:seconds,offset:formatOffset(seconds)});
   }
  }
  candidates.sort((a,b)=>a.utcMs-b.utcMs);
  return {
    status:candidates.length===0?"gap":candidates.length>1?"ambiguous":"unique",
    zone,date,time,candidates,
    message:candidates.length===0?"Такого местного времени не было из-за перевода часов (либо исторические данные часового пояса недоступны).":
      candidates.length>1?"Местное время повторялось. Уточните первое или второе вхождение по документам.":
      "Однозначное местное время согласно данным часовых поясов браузера."
  };
 }
 return Object.freeze({VERSION,ZONES,parseWall,validateZone,partsAt,offsetSecondsAt,formatOffset,resolve});
});
