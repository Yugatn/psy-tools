/* PSY-TOOLS · Песочные часы v1.0
 * State transitions are deterministic, sand geometry is a function of elapsed
 * REAL wall-clock milliseconds; requestAnimationFrame is presentation only.
 * No setInterval ticks are used as the source of elapsed time.
 */
(function(root,factory) {
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.SandTimerEngine=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
 "use strict";
 const VERSION="1.0.0", KEY="psy-tools.sand-timer.v1",MAX_MS=24*60*60*1000;
 const PRESETS=Object.freeze([
  {label:"30 сек",ms:30000},{label:"1 мин",ms:60000},{label:"3 мин",ms:180000},
  {label:"5 мин",ms:300000},{label:"10 мин",ms:600000},{label:"15 мин",ms:900000},
  {label:"25 мин",ms:1500000},{label:"30 мин",ms:1800000},
  {label:"45 мин",ms:2700000},{label:"1 час",ms:3600000},
  {label:"1,5 часа",ms:5400000}
 ]);
 const validMs=ms=>{
  if(!Number.isSafeInteger(ms)||ms<1000||ms>MAX_MS)
   throw Error("Задайте интервал от 1 секунды до 24 часов.");
  return ms;
 };
 function fromFields(h,m,s) {
  for(const v of [h,m,s])if(v===null||v===undefined||String(v).trim()===""||
    !/^\d{1,3}$/.test(String(v)))throw Error("Введите часы, минуты и секунды целыми неотрицательными числами.");
  const hh=Number(h),mm=Number(m),ss=Number(s);
  if(hh>24||mm>59||ss>59)throw Error("Часы — до 24, минуты и секунды — до 59.");
  return validMs((hh*3600+mm*60+ss)*1000);
 }
 function toFields(ms) {
  ms=validMs(ms);const s=Math.floor(ms/1000);
  return {hours:Math.floor(s/3600),minutes:Math.floor(s%3600/60),seconds:s%60};
 }
 const assertNow=now=>{if(!Number.isFinite(now)||now<0)throw Error("Некорректные показания часов устройства.");return now;};
 function create(durationMs=300000){
  const d=validMs(durationMs);
  return {schema:"psy-tools-sand-timer",version:1,status:"idle",durationMs:d,
   remainingMs:d,deadlineMs:null};
 }
 function check(input){
  if(!input||input.schema!=="psy-tools-sand-timer"||input.version!==1)
   throw Error("Некорректный формат таймера.");
  const durationMs=validMs(input.durationMs);
  if(!["idle","running","paused","completed"].includes(input.status))throw Error("Некорректный статус таймера.");
  if(!Number.isFinite(input.remainingMs)||input.remainingMs<0||input.remainingMs>durationMs)
   throw Error("Некорректный остаток таймера.");
  if(input.status==="running"&&(!Number.isFinite(input.deadlineMs)||input.deadlineMs<0))
   throw Error("Некорректный момент окончания таймера.");
  return {schema:"psy-tools-sand-timer",version:1,status:input.status,
   durationMs,remainingMs:input.remainingMs,
   deadlineMs:input.status==="running"?input.deadlineMs:null};
 }
 function snapshot(state,now=Date.now()){
  const s=check(state);assertNow(now);
  let remainingMs=s.remainingMs, status=s.status;
  if(status==="running"){
   remainingMs=Math.max(0,s.deadlineMs-now);
   if(remainingMs===0)status="completed";
  }
  if(status==="completed")remainingMs=0;
  const progress=Math.min(1,Math.max(0,1-remainingMs/s.durationMs));
  // In the SVG, chamber widths are 16 at the neck and 176 at each end.
  // The sand area (and hence illustrated volume) must vary LINEARLY with time.
  // Top neck-up fill: (16*h + 80*h²) / 96 = remaining volume.
  // Bottom floor-up fill: (176*h - 80*h²) / 96 = elapsed volume.
  const r=1-progress;
  const topSandHeight=(Math.sqrt(256+30720*r)-16)/160;
  const bottomSandHeight=(176-Math.sqrt(30976-30720*progress))/160;
  return {...s,status,remainingMs,deadlineMs:status==="running"?s.deadlineMs:null,
   elapsedMs:s.durationMs-remainingMs,progress,remainingFraction:r,
   topSandHeight,bottomSandHeight,
   flowing:status==="running"&&remainingMs>0};
 }
 function start(state,now=Date.now()){
  assertNow(now);
  const s=snapshot(state,now);
  if(s.status==="running")return check(state);
  const remain=s.status==="completed"?s.durationMs:s.remainingMs;
  return check({...s,status:"running",remainingMs:remain,deadlineMs:now+remain});
 }
 function pause(state,now=Date.now()){
  const s=snapshot(state,now);
  if(s.status!=="running")return check(s);
  return check({...s,status:"paused",deadlineMs:null});
 }
 function reset(state,durationMs=null){
  const s=check(state);
  return create(durationMs===null?s.durationMs:durationMs);
 }
 function replaceDuration(state,durationMs){
  const s=check(state);if(s.status==="running")throw Error("Для изменения интервала сначала остановите таймер.");
  return create(durationMs);
 }
 function restore(raw,now=Date.now()){
  const payload=typeof raw==="string"?JSON.parse(raw):raw;
  const s=check(payload);
  const snap=snapshot(s,now);
  return check({...snap});
 }
 function formatMs(ms){
  if(!Number.isFinite(ms)||ms<0)throw Error("Неверный интервал.");
  const sec=Math.ceil(ms/1000),hh=Math.floor(sec/3600),mm=Math.floor(sec%3600/60),ss=sec%60;
  return (hh>0?String(hh).padStart(2,"0")+":":"")+
   String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");
 }
 return Object.freeze({VERSION,KEY,MAX_MS,PRESETS,validMs,fromFields,toFields,
  create,check,snapshot,start,pause,reset,replaceDuration,restore,formatMs});
});
