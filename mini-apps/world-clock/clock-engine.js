/* PSY-TOOLS · Мировые часы — вычислительное ядро v1.0.
 * Coordinates -> IANA is only a suggested zone. Civil times always use Intl.
 * No network; local UTC calculations cannot establish time independent of device clock.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WorldClockEngine=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
 "use strict";
 const VERSION="1.0.0",MAX_CITIES=12,KEY="psy-tools.world-clock.v1";
 const PRESETS=Object.freeze([
  ["Москва","Россия","Europe/Moscow",55.7558,37.6173],
  ["Санкт-Петербург","Россия","Europe/Moscow",59.9343,30.3351],
  ["Калининград","Россия","Europe/Kaliningrad",54.7104,20.4522],
  ["Екатеринбург","Россия","Asia/Yekaterinburg",56.8389,60.6057],
  ["Новосибирск","Россия","Asia/Novosibirsk",55.0084,82.9357],
  ["Красноярск","Россия","Asia/Krasnoyarsk",56.0153,92.8932],
  ["Иркутск","Россия","Asia/Irkutsk",52.2869,104.3050],
  ["Якутск","Россия","Asia/Yakutsk",62.0355,129.6755],
  ["Владивосток","Россия","Asia/Vladivostok",43.1155,131.8855],
  ["Хабаровск","Россия","Asia/Vladivostok",48.4802,135.0719],
  ["Минск","Беларусь","Europe/Minsk",53.9,27.5667],
  ["Брест","Беларусь","Europe/Minsk",52.0976,23.6878],
  ["Лондон","Великобритания","Europe/London",51.5074,-0.1278],
  ["Париж","Франция","Europe/Paris",48.8566,2.3522],
  ["Берлин","Германия","Europe/Berlin",52.5200,13.4050],
  ["Стокгольм","Швеция","Europe/Stockholm",59.3293,18.0686],
  ["Рим","Италия","Europe/Rome",41.9028,12.4964],
  ["Мадрид","Испания","Europe/Madrid",40.4168,-3.7038],
  ["Лиссабон","Португалия","Europe/Lisbon",38.7223,-9.1393],
  ["Хельсинки","Финляндия","Europe/Helsinki",60.1699,24.9384],
  ["Стамбул","Турция","Europe/Istanbul",41.0082,28.9784],
  ["Киев","Украина","Europe/Kyiv",50.4501,30.5234],
  ["Варшава","Польша","Europe/Warsaw",52.2297,21.0122],
  ["Тбилиси","Грузия","Asia/Tbilisi",41.7151,44.8271],
  ["Ереван","Армения","Asia/Yerevan",40.1792,44.4991],
  ["Баку","Азербайджан","Asia/Baku",40.4093,49.8671],
  ["Алматы","Казахстан","Asia/Almaty",43.2220,76.8512],
  ["Астана","Казахстан","Asia/Almaty",51.1694,71.4491],
  ["Ташкент","Узбекистан","Asia/Tashkent",41.2995,69.2401],
  ["Дубай","ОАЭ","Asia/Dubai",25.2048,55.2708],
  ["Дели","Индия","Asia/Kolkata",28.6139,77.2090],
  ["Мумбаи","Индия","Asia/Kolkata",19.0760,72.8777],
  ["Бангкок","Таиланд","Asia/Bangkok",13.7563,100.5018],
  ["Дананг","Вьетнам","Asia/Ho_Chi_Minh",16.0544,108.2022],
  ["Ханой","Вьетнам","Asia/Ho_Chi_Minh",21.0278,105.8342],
  ["Хошимин","Вьетнам","Asia/Ho_Chi_Minh",10.8231,106.6297],
  ["Сингапур","Сингапур","Asia/Singapore",1.3521,103.8198],
  ["Гонконг","Китай","Asia/Hong_Kong",22.3193,114.1694],
  ["Пекин","Китай","Asia/Shanghai",39.9042,116.4074],
  ["Шанхай","Китай","Asia/Shanghai",31.2304,121.4737],
  ["Сеул","Южная Корея","Asia/Seoul",37.5665,126.9780],
  ["Токио","Япония","Asia/Tokyo",35.6762,139.6503],
  ["Сидней","Австралия","Australia/Sydney",-33.8688,151.2093],
  ["Мельбурн","Австралия","Australia/Melbourne",-37.8136,144.9631],
  ["Окленд","Новая Зеландия","Pacific/Auckland",-36.8485,174.7633],
  ["Нью-Йорк","США","America/New_York",40.7128,-74.0060],
  ["Бостон","США","America/New_York",42.3601,-71.0589],
  ["Вашингтон","США","America/New_York",38.9072,-77.0369],
  ["Чикаго","США","America/Chicago",41.8781,-87.6298],
  ["Денвер","США","America/Denver",39.7392,-104.9903],
  ["Финикс","США","America/Phoenix",33.4484,-112.0740],
  ["Лос-Анджелес","США","America/Los_Angeles",34.0522,-118.2437],
  ["Сан-Франциско","США","America/Los_Angeles",37.7749,-122.4194],
  ["Торонто","Канада","America/Toronto",43.6532,-79.3832],
  ["Ванкувер","Канада","America/Vancouver",49.2827,-123.1207],
  ["Мехико","Мексика","America/Mexico_City",19.4326,-99.1332],
  ["Сан-Паулу","Бразилия","America/Sao_Paulo",-23.5505,-46.6333],
  ["Буэнос-Айрес","Аргентина","America/Argentina/Buenos_Aires",-34.6037,-58.3816],
  ["Кейптаун","ЮАР","Africa/Johannesburg",-33.9249,18.4241],
  ["Каир","Египет","Africa/Cairo",30.0444,31.2357],
  ["Найроби","Кения","Africa/Nairobi",-1.2921,36.8219]
 ]);
 const norm=s=>String(s||"").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/\s+/g," ").trim();
 const presetCities=Object.freeze(PRESETS.map(([name,country,zone,latitude,longitude])=>Object.freeze({
   id:"w:"+norm(name).replace(/[^a-zа-я0-9]+/g,"-")+":"+zone,
   name,country,region:"",zone,latitude,longitude,source:"curated"
 })));
 function validateZone(zone){
  if(typeof zone!=="string"||!/^[A-Za-z0-9_+\-/]{2,80}$/.test(zone))
   throw Error("Укажите действительный часовой пояс IANA.");
  try{new Intl.DateTimeFormat("en-GB",{timeZone:zone}).format(new Date(0));return zone;}
  catch(e){throw Error("Неподдерживаемая браузером временная зона: "+zone);}
 }
 function getFormat(zone,locale,opts){return new Intl.DateTimeFormat(locale,{timeZone:zone,...opts});}
 function partsAt(ms,zone){
  const fields=Object.fromEntries(getFormat(zone,"en-GB",{
   calendar:"gregory",numberingSystem:"latn",year:"numeric",month:"2-digit",
   day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
  }).formatToParts(new Date(ms)).filter(x=>/^(year|month|day|hour|minute|second)$/.test(x.type))
   .map(x=>[x.type,Number(x.value)]));
  return fields;
 }
 function offsetSeconds(ms,zone){
  const t=Math.trunc(ms/1000)*1000;
  const p=partsAt(t,zone);
  return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-t)/1000);
 }
 function offsetLabel(seconds){
  const sign=seconds<0?"−":"+",n=Math.abs(seconds);
  return "UTC"+sign+String(Math.floor(n/3600)).padStart(2,"0")+":"+String(Math.floor(n%3600/60)).padStart(2,"0")+(n%60?":"+String(n%60).padStart(2,"0"):"");
 }
 function snapshot(zone,date=new Date(),baseZone=null){
  validateZone(zone);
  const ms=date instanceof Date?date.getTime():Number(date);
  if(!Number.isFinite(ms))throw Error("Неправильный момент времени.");
  const p=partsAt(ms,zone);
  const day=getFormat(zone,"ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date(ms));
  const clock=getFormat(zone,"ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(ms));
  const off=offsetSeconds(ms,zone),baseOff=baseZone?offsetSeconds(ms,validateZone(baseZone)):off;
  return {clock,day,zone,offset:off,offsetLabel:offsetLabel(off),differenceMinutes:(off-baseOff)/60,
   parts:p,utcISO:new Date(ms).toISOString()};
 }
 function differenceLabel(minutes){
  const sign=minutes<0?"−":minutes>0?"+":"±";
  const n=Math.abs(minutes);
  return sign+String(Math.floor(n/60))+":"+String(n%60).padStart(2,"0");
 }
 function parseDateTime(date,time){
  const d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||"");
  const h=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(time||"");
  if(!d||!h)throw Error("Введите корректную дату и время в основном городе.");
  const y=+d[1],mo=+d[2],day=+d[3],hour=+h[1],minute=+h[2];
  if(y<1900||y>2100)throw Error("Поддерживаются даты 1900–2100.");
  const base=Date.UTC(y,mo-1,day,hour,minute);
  const v=new Date(base);
  if(v.getUTCFullYear()!==y||v.getUTCMonth()!==mo-1||v.getUTCDate()!==day)throw Error("Несуществующая календарная дата.");
  return {base,y,mo,day,hour,minute};
 }
 function resolveWallTime(date,time,zone){
  validateZone(zone);
  const d=parseDateTime(date,time);
  const candidates=[],offsets=new Set();
  for(let h=-36;h<=36;h+=6)offsets.add(offsetSeconds(d.base+h*3600000,zone));
  for(const offset of offsets){
   const ms=d.base-offset*1000,p=partsAt(ms,zone);
   if(p.year===d.y&&p.month===d.mo&&p.day===d.day&&p.hour===d.hour&&p.minute===d.minute&&!candidates.some(x=>x.ms===ms)){
    candidates.push({ms,iso:new Date(ms).toISOString(),offset,offsetLabel:offsetLabel(offset)});
   }
  }
  candidates.sort((a,b)=>a.ms-b.ms);
  return {zone,date,time,candidates,status:candidates.length===0?"gap":candidates.length>1?"fold":"unique"};
 }
 const RUSSIAN_ZONE_CORRECTIONS=Object.freeze({
  "Вяземский|Хабаровский край":"Asia/Vladivostok",
  "Горняк|Алтайский край":"Asia/Barnaul",
  "Николаевск-на-Амуре|Хабаровский край":"Asia/Vladivostok",
  "Облучье|Еврейская автономная область":"Asia/Vladivostok",
  "Светогорск|Ленинградская область":"Europe/Moscow",
  "Северо-Курильск|Сахалинская область":"Asia/Sakhalin"
 });
 function suggestZone(city,country,geoLookup,instant=Date.now()){
  if(!city||typeof city!=="object")throw Error("Не выбран город.");
  if(country==="WORLD")return {zone:validateZone(city.zone),confidence:"confirmed",
    explanation:"Часовая зона указана в проверенной подборке городов."};
  if(country==="BY")return {zone:"Europe/Minsk",confidence:"confirmed",
    explanation:"Для городов Беларуси используется IANA Europe/Minsk."};
  if(country!=="RU")throw Error("Неизвестный справочник страны.");
  if(typeof geoLookup!=="function")throw Error("Нет локальной географической базы часовых поясов.");
  const corrected=RUSSIAN_ZONE_CORRECTIONS[city.name+"|"+city.region];
  const predicted=validateZone(corrected||geoLookup(city.latitude,city.longitude));
  const actual=Math.round(offsetSeconds(instant,predicted)/60);
  const m=/^UTC([+-])(\d{1,2})(?::(\d\d))?$/.exec(String(city.utcCurrent||""));
  let warning="Пояс предложен по координатам, проверьте IANA-зону перед добавлением.";
  if(corrected)warning="Пояс скорректирован для города: географическая аппроксимация у границ ошибалась.";
  if(m){
   const expected=(m[1]==="-"?-1:1)*(+m[2]*60+(+(m[3]||0)));
   if(expected!==actual)warning="Предупреждение: найденная зона расходится со справочным UTC города ("+
    city.utcCurrent+" против "+offsetLabel(actual*60)+"). Проверьте зону вручную.";
  }
  return {zone:predicted,confidence:corrected?"confirmed":"suggested",explanation:warning};
 }
 function normalizeCity(city){
  if(!city||typeof city!=="object")throw Error("Нет данных города.");
  const id=String(city.id||"").slice(0,130),name=String(city.name||"").slice(0,100);
  const country=String(city.country||"").slice(0,100),region=String(city.region||"").slice(0,120);
  const zone=validateZone(city.zone);
  if(!id||!name||!country)throw Error("Неполная запись города.");
  const confidence=city.confidence==="confirmed"?"confirmed":"suggested";
  return {id,name,country,region,zone,confidence};
 }
 function defaultState(){
  return {schema:"psy-tools-world-clock",version:1,
   home:normalizeCity({...presetCities.find(x=>x.name==="Москва"),confidence:"confirmed"}),
   extras:[normalizeCity({...presetCities.find(x=>x.name==="Минск"),confidence:"confirmed"}),
     normalizeCity({...presetCities.find(x=>x.name==="Лондон"),confidence:"confirmed"}),
     normalizeCity({...presetCities.find(x=>x.name==="Нью-Йорк"),confidence:"confirmed"})]};
 }
 function normalizeState(input){
  if(!input||input.schema!=="psy-tools-world-clock"||input.version!==1||!Array.isArray(input.extras))
   throw Error("Неподдерживаемый формат сохранённых часов.");
  const home=normalizeCity(input.home),extras=[],seen=new Set([home.id]);
  for(const c of input.extras.slice(0,40)){
    const item=normalizeCity(c);
    if(!seen.has(item.id)&&extras.length<MAX_CITIES-1){extras.push(item);seen.add(item.id)}
  }
  return {schema:"psy-tools-world-clock",version:1,home,extras};
 }
 function addCity(state,city,asHome=false){
  const current=normalizeState(state),item=normalizeCity(city);
  const extras=current.extras.filter(c=>c.id!==item.id&&c.id!==current.home.id);
  if(asHome){
    if(current.home.id!==item.id)extras.unshift(current.home);
    return normalizeState({...current,home:item,extras:extras.slice(0,MAX_CITIES-1)});
  }
  if(item.id===current.home.id||current.extras.some(c=>c.id===item.id))return current;
  if(current.extras.length>=MAX_CITIES-1)throw Error("Можно сохранить не более "+MAX_CITIES+" городов вместе с основным.");
  return normalizeState({...current,extras:[...current.extras,item]});
 }
 function removeCity(state,id){
  const s=normalizeState(state);
  if(s.home.id===id)throw Error("Основной город нельзя удалить, пока не выбран другой.");
  return normalizeState({...s,extras:s.extras.filter(c=>c.id!==id)});
 }
 function moveCity(state,id,direction){
  const s=normalizeState(state),i=s.extras.findIndex(c=>c.id===id),j=i+direction;
  if(i<0||j<0||j>=s.extras.length)return s;
  [s.extras[i],s.extras[j]]=[s.extras[j],s.extras[i]];
  return s;
 }
 function searchPresets(query,limit=40){
  const q=norm(query);
  if(!q)return presetCities.slice(0,limit);
  return presetCities.filter(c=>norm(c.name+" "+c.country).includes(q)).slice(0,limit);
 }
 return Object.freeze({VERSION,KEY,MAX_CITIES,presetCities,validateZone,snapshot,offsetSeconds,
  offsetLabel,differenceLabel,parseDateTime,resolveWallTime,normalizeCity,defaultState,
  normalizeState,addCity,removeCity,moveCity,searchPresets,suggestZone});
});