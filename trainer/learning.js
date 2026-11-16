/* Adaptive Skill Trainer learning cycle v2, additive to original curriculum.
 * Self-reported repetitions, not proof of acquired ability. © 2026 Югатн.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.AdaptiveSkillLearning = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = 1;
  const BACKUP_VERSION = 2;
  const BACKUP_FORMAT = "psy-tools/adaptive-skill-trainer";
  const MAX_DAYS = 32;
  const REVIEW = Object.freeze({
    editorial: "на проверке",
    evidence: "не подтверждено",
    explanation: "Авторские тренировочные сценарии ждут редакционной и педагогической проверки. Они не являются валидированными тестами."
  });
  function dateNumber(day) {
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NaN;
    const time = Date.parse(day + "T00:00:00.000Z");
    return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === day ? time : NaN;
  }
  function dayOf(date) {
    const v = date instanceof Date ? date : new Date(date || Date.now());
    if (!Number.isFinite(v.valueOf())) throw new Error("Некорректная дата");
    // The day is the user's local calendar date; all comparisons use canonical YYYY-MM-DD.
    return [v.getFullYear(),String(v.getMonth()+1).padStart(2,"0"),String(v.getDate()).padStart(2,"0")].join("-");
  }
  function freshJournal() { return {version:VERSION, entries:{}}; }
  function itemsById(data) { return new Map(data.scenarios.map(item => [item.id,item])); }
  function validMet(met,item) {
    if (!Array.isArray(met)) return [];
    return [...new Set(met.filter(x => Number.isInteger(x) && x >= 0 && x < item.criteria.length))].sort((a,b) => a-b);
  }
  function normalizeJournal(value,data) {
    if (!value) return freshJournal();
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== VERSION ||
        !value.entries || typeof value.entries !== "object" || Array.isArray(value.entries))
      throw new Error("Неподдерживаемый журнал упражнений");
    const result = freshJournal(), items = itemsById(data);
    for (const [id,rows] of Object.entries(value.entries)) {
      const item = items.get(id); if (!item || !Array.isArray(rows)) continue;
      const unique = new Map();
      rows.slice(-MAX_DAYS*2).forEach(row => {
        if (!row || typeof row !== "object" || !Number.isFinite(dateNumber(row.day))) return;
        unique.set(row.day,{day:row.day,met:validMet(row.met,item)});
      });
      const days = [...unique.values()].sort((a,b) => a.day.localeCompare(b.day)).slice(-MAX_DAYS);
      if (days.length) result.entries[id] = days;
    }
    return result;
  }
  function record(journal,data,id,met,day) {
    const item = itemsById(data).get(id);
    if (!item || !Number.isFinite(dateNumber(day))) throw new Error("Неизвестная ситуация или дата");
    const checked = validMet(met,item);
    if (!checked.length) throw new Error("Отметьте хотя бы один наблюдаемый признак практики");
    const next = normalizeJournal(journal,data);
    const rows = (next.entries[id] || []).filter(row => row.day !== day);
    rows.push({day,met:checked});
    next.entries[id] = rows.sort((a,b) => a.day.localeCompare(b.day)).slice(-MAX_DAYS);
    return next;
  }
  function undoLast(journal,data,id) {
    if (!itemsById(data).has(id)) throw new Error("Неизвестная ситуация");
    const next = normalizeJournal(journal,data);
    if (next.entries[id] && next.entries[id].length) {
      next.entries[id].pop();
      if (!next.entries[id].length) delete next.entries[id];
    }
    return next;
  }
  function learningStatus(item,response,journal) {
    if (!response) return "не начато";
    const entries = journal.entries[item.id] || [];
    const complete = entries.filter(row => row.met.length === item.criteria.length);
    for (let i=0;i<complete.length;i++) for (let j=i+1;j<complete.length;j++) {
      if ((dateNumber(complete[j].day) - dateNumber(complete[i].day)) / 86400000 >= 3)
        return "закреплено";
    }
    return "в процессе";
  }
  function isDue(item,response,journal,day) {
    if (!response || learningStatus(item,response,journal)==="закреплено") return false;
    const entries=(journal.entries[item.id]||[]).filter(row => row.met.length === item.criteria.length);
    if (!entries.length || !Number.isFinite(dateNumber(day))) return false;
    return (dateNumber(day)-dateNumber(entries[entries.length-1].day))/86400000 >= 3;
  }
  function stats(state,journal,data,age,skill) {
    const rows=data.scenarios.filter(item => (!age || item.age===age) && (!skill || item.skill===skill));
    const entries=normalizeJournal(journal,data);
    const totals={"не начато":0,"в процессе":0,"закреплено":0};
    rows.forEach(item => totals[learningStatus(item,state.responses[item.id],entries)]++);
    return {total:rows.length,notStarted:totals["не начато"],inProgress:totals["в процессе"],reinforced:totals["закреплено"]};
  }
  function recommend(state,journal,data,age,skill,day) {
    const rows=data.scenarios.filter(item => (!age || item.age===age) && (!skill || item.skill===skill));
    const log=normalizeJournal(journal,data);
    return rows.find(item => isDue(item,state.responses[item.id],log,day)) ||
      rows.find(item => !state.responses[item.id]) ||
      rows.find(item => learningStatus(item,state.responses[item.id],log)==="в процессе") ||
      rows[0] || null;
  }
  function exportBundle(state,journal,data,core) {
    const clean=core.normalizeState(state,data);
    return JSON.stringify({
      format:BACKUP_FORMAT, version:BACKUP_VERSION,
      responses:clean.responses,
      practiceJournal:normalizeJournal(journal,data)
    },null,2);
  }
  function importBundle(raw,data,core) {
    if (!raw || typeof raw!=="object" || Array.isArray(raw)) throw new Error("Неподдерживаемый формат");
    if (raw.version===1) return {state:core.normalizeState(raw,data),journal:freshJournal(),legacy:true};
    if (raw.version!==BACKUP_VERSION || raw.format!==BACKUP_FORMAT) throw new Error("Неподдерживаемая версия резервной копии");
    if (!Object.hasOwn(raw,"practiceJournal")) throw new Error("Нет журнала практики");
    return {
      state:core.normalizeState({version:1,responses:raw.responses},data),
      journal:normalizeJournal(raw.practiceJournal,data),legacy:false
    };
  }
  return {
    VERSION, BACKUP_VERSION, REVIEW, MAX_DAYS, dayOf, dateNumber, freshJournal, normalizeJournal,
    record, undoLast, learningStatus, isDue, stats, recommend, exportBundle, importBundle
  };
});
