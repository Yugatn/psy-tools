/* КДИ-9 · Матрица потоков АС · модель данных v1
 * Авторская девятка: канон Югатна; исследовательская реализация, не диагностика.
 * Источник: Notion /p/404d1323859981a7bad8cf955a09a0d7
 * UNKNOWN != ABSENT; MODEL != REALITY. Не выводить отсутствие субъектности из оценки.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NineStreamsModel = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null), function () {
  "use strict";
  const SCHEMA = "psy-tools-nine-streams";
  const VERSION = 1;
  const STORAGE_KEY = "psy-tools.nine-streams.v1";
  const STREAMS = Object.freeze([
    {id:"F1",name:"Зрение",prompt:"Насколько зрительная информация помогает мне в выбранной среде?"},
    {id:"F2",name:"Слух",prompt:"Насколько удобна мне звуковая информация и общение в этом контексте?"},
    {id:"F3",name:"Обоняние",prompt:"Насколько комфортно я воспринимаю запахи в этой среде?"},
    {id:"F4",name:"Вкус",prompt:"Насколько комфортно мне вкусовое восприятие в обычной жизни?"},
    {id:"F5",name:"Осязание",prompt:"Насколько удобно мне тактильное восприятие и контакт с предметами?"},
    {id:"F6",name:"Проприоцепция",prompt:"Насколько уверенно я ощущаю положение и движение тела?"},
    {id:"F7",name:"Равновесие",prompt:"Насколько комфортно я ориентируюсь при изменении положения и движения?"},
    {id:"F8",name:"Интероцепция",prompt:"Насколько понятно мне воспринимать и описывать внутренние ощущения тела?"},
    {id:"F9",name:"Социальная сопричастность",prompt:"Насколько я сейчас ощущаю связь и принятие среди других субъектов?"}
  ]);
  const AXES = Object.freeze({
    organism: Object.freeze([
      {id:"human",label:"Человек (самонаблюдение)"},
      {id:"cavefish",label:"Пещерная рыба (наблюдения)"},
      {id:"bat",label:"Летучая мышь (наблюдения)"}
    ]),
    environment: Object.freeze([
      {id:"regular",label:"Привычная среда"},
      {id:"dark",label:"Недостаток света"},
      {id:"aquatic",label:"Водная среда"}
    ]),
    slice: Object.freeze([
      {id:"s1",label:"Срез 1"},
      {id:"s2",label:"Срез 2"},
      {id:"s3",label:"Срез 3"}
    ])
  });
  const STATUSES = Object.freeze([
    {id:"unknown",label:"Неизвестно"},
    {id:"present",label:"Наблюдается"},
    {id:"absent",label:"Не обнаружено"},
    {id:"na",label:"Неприменимо"}
  ]);
  const valid = (group,id) => AXES[group].some(x=>x.id===id);
  function key(o,e,s) {
    if (!valid("organism",o) || !valid("environment",e) || !valid("slice",s)) return null;
    return o+"|"+e+"|"+s;
  }
  function blankCell() {
    return {streams:STREAMS.map(()=>({status:"unknown",comfort:null})),note:"",evidence:"",updatedAt:null};
  }
  function normalizeCell(raw,organism) {
    const src = raw && typeof raw==="object" && !Array.isArray(raw) ? raw : {};
    const arr = Array.isArray(src.streams) ? src.streams : [];
    const streams = STREAMS.map((_,i)=>{
      const item=arr[i] && typeof arr[i]==="object" && !Array.isArray(arr[i]) ? arr[i] : {};
      const status=STATUSES.some(s=>s.id===item.status) ? item.status : "unknown";
      const n=item.comfort;
      const comfort = organism==="human" && status==="present" && n!=="" && n!==null && n!==undefined && typeof n==="number" && Number.isFinite(n) && n>=0 && n<=10 ? n : null;
      return {status,comfort};
    });
    const note=typeof src.note==="string" ? src.note.slice(0,1200) : "";
    const evidence=typeof src.evidence==="string" ? src.evidence.slice(0,1200) : "";
    const updatedAt=typeof src.updatedAt==="string" && /^\d{4}-\d\d-\d\dT/.test(src.updatedAt) ? src.updatedAt.slice(0,35) : null;
    return {streams,note,evidence,updatedAt};
  }
  function emptyState(){return {schema:SCHEMA,version:VERSION,entries:{}};}
  function normalizeState(raw){
    if (!raw || typeof raw!=="object" || raw.schema!==SCHEMA || raw.version!==VERSION ||
        !raw.entries || typeof raw.entries!=="object" || Array.isArray(raw.entries))
      throw new Error("Неверная схема файла. Ожидается версия psy-tools-nine-streams v1.");
    const result=emptyState();
    for (const [k,v] of Object.entries(raw.entries)) {
      const parts=k.split("|");
      if (parts.length===3 && key(...parts)===k)
        result.entries[k]=normalizeCell(v,parts[0]);
    }
    return result;
  }
  function getCell(state,o,e,s){
    const k=key(o,e,s);
    if (!k) throw new Error("Неизвестная координата матрицы");
    return normalizeCell(state && state.entries ? state.entries[k] : null,o);
  }
  function putCell(state,o,e,s,cell){
    const k=key(o,e,s);
    if (!k) throw new Error("Неизвестная координата матрицы");
    const next=normalizeState(state);
    const c=normalizeCell(cell,o);
    c.updatedAt=new Date().toISOString();
    next.entries[k]=c;
    return next;
  }
  function summary(cell,organism){
    const c=normalizeCell(cell,organism);
    const rated=c.streams.map(x=>x.comfort).filter(x=>x!==null);
    return {
      rated:rated.length,
      mean:rated.length ? Math.round(rated.reduce((a,b)=>a+b,0)/rated.length*10)/10 : null,
      present:c.streams.filter(x=>x.status==="present").length,
      absent:c.streams.filter(x=>x.status==="absent").length,
      unknown:c.streams.filter(x=>x.status==="unknown").length,
      notApplicable:c.streams.filter(x=>x.status==="na").length
    };
  }
  function parse(text){
    if(typeof text!=="string" || text.length>2000000) throw new Error("Файл превышает допустимый размер");
    return normalizeState(JSON.parse(text));
  }
  return Object.freeze({SCHEMA,VERSION,STORAGE_KEY,STREAMS,AXES,STATUSES,key,blankCell,normalizeCell,emptyState,normalizeState,getCell,putCell,summary,parse});
});
