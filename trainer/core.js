/* Adaptive Skill Trainer core (pure, dependency-free). © 2026 Югатн. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.AdaptiveSkillCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = 1;
  const MAX_NOTE = 500;
  function idsOf(data) { return new Set(data.scenarios.map(item => item.id)); }
  function validateCurriculum(data) {
    if (!data || !Array.isArray(data.scenarios) || !Array.isArray(data.ages) || !Array.isArray(data.skills)) return false;
    const ages = new Set(data.ages.map(item => item.id));
    const skills = new Set(data.skills.map(item => item.id));
    const ids = new Set();
    for (const item of data.scenarios) {
      if (typeof item.id !== "string" || !/^[a-z0-9-]{1,32}$/i.test(item.id) || ids.has(item.id)) return false;
      ids.add(item.id);
      if (!ages.has(item.age) || !skills.has(item.skill) || !item.title || !item.goal || !item.situation || !item.practice) return false;
      if (!Array.isArray(item.questions) || item.questions.length < 2 || !Array.isArray(item.criteria) || item.criteria.length < 2) return false;
      if (!Array.isArray(item.options) || item.options.length !== 3) return false;
      if (item.options.some(option => !option.text || !option.feedback || !["supportive","mixed","risky"].includes(option.type))) return false;
    }
    return true;
  }
  function freshState() { return { version: VERSION, responses: {} }; }
  function normalizeState(value, data) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== VERSION) throw new Error("Неподдерживаемый формат данных");
    if (!value.responses || typeof value.responses !== "object" || Array.isArray(value.responses)) throw new Error("Некорректная история");
    const allowed = idsOf(data);
    const result = freshState();
    for (const [id, response] of Object.entries(value.responses)) {
      if (!allowed.has(id) || !response || typeof response !== "object" || Array.isArray(response)) continue;
      const option = Number.isInteger(response.option) && response.option >= 0 && response.option < 3 ? response.option : null;
      const practiced = response.practiced === true && option !== null;
      const before = Number.isInteger(response.before) && response.before >= 1 && response.before <= 5 ? response.before : null;
      const after = Number.isInteger(response.after) && response.after >= 1 && response.after <= 5 ? response.after : null;
      const note = typeof response.note === "string" ? response.note.slice(0, MAX_NOTE) : "";
      const timestamp = typeof response.updatedAt === "string" && /^\d{4}-\d\d-\d\dT/.test(response.updatedAt) ? response.updatedAt.slice(0, 32) : null;
      if (option !== null) result.responses[id] = { option, practiced, before, after, note, updatedAt: timestamp };
    }
    return result;
  }
  function clone(state, data) { return normalizeState(state, data); }
  function answer(state, id, option, data, now) {
    if (!idsOf(data).has(id) || !Number.isInteger(option) || option < 0 || option > 2) throw new Error("Неизвестная ситуация или вариант");
    const next = clone(state, data);
    const previous = next.responses[id] || {};
    next.responses[id] = {
      option, practiced: previous.option === option ? Boolean(previous.practiced) : false,
      before: previous.before ?? null,
      after: previous.option === option ? (previous.after ?? null) : null,
      note: previous.option === option ? (previous.note || "") : "",
      updatedAt: now || new Date().toISOString()
    };
    return next;
  }
  function practice(state, id, info, data, now) {
    const next = clone(state, data);
    if (!Object.hasOwn(next.responses, id)) throw new Error("Сначала исследуйте ситуацию");
    const current = next.responses[id];
    const rating = value => Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
    current.practiced = info.practiced === true;
    current.note = typeof info.note === "string" ? info.note.trim().slice(0, MAX_NOTE) : "";
    current.before = rating(info.before);
    current.after = rating(info.after);
    current.updatedAt = now || new Date().toISOString();
    return next;
  }
  function progress(state, data, age, skill) {
    const rows = data.scenarios.filter(item => (!age || item.age === age) && (!skill || item.skill === skill));
    const replies = normalizeState(state, data).responses;
    return {
      total: rows.length,
      explored: rows.filter(item => Object.hasOwn(replies, item.id)).length,
      practiced: rows.filter(item => replies[item.id] && replies[item.id].practiced).length
    };
  }
  function nextScenario(state, data, age, skill) {
    const replies = normalizeState(state, data).responses;
    const rows = data.scenarios.filter(item => (!age || item.age === age) && (!skill || item.skill === skill));
    return rows.find(item => !replies[item.id]) ||
      rows.find(item => !replies[item.id].practiced) || rows[0] || null;
  }
  function safeJSON(state, data) { return JSON.stringify(normalizeState(state, data), null, 2); }
  return { VERSION, MAX_NOTE, validateCurriculum, freshState, normalizeState, answer, practice, progress, nextScenario, safeJSON };
});
