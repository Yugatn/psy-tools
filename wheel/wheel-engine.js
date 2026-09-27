/* Wheel Engine — shared compatibility layer
 * The pages remain self-contained for backwards compatibility. This module provides
 * a stable API for future migration without changing stored data or UI contracts.
 */
(function () {
  "use strict";
  const root = window.WheelEngine = window.WheelEngine || {};
  root.version = "1.0.0";
  root.clamp = function (value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };
  root.average = function (values) {
    if (!Array.isArray(values) || !values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
  };
  root.parseJSON = function (value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  };
  root.normalizeValues = function (values, length, fallback) {
    const source = Array.isArray(values) ? values : [];
    const base = Number.isFinite(Number(fallback)) ? Number(fallback) : 5;
    return Array.from({ length }, (_, index) => root.clamp(source[index] ?? base, 0, 10));
  };
  root.history = {
    read(key, parse, fallback) {
      try { return parse(localStorage.getItem(key) || "[]", fallback); }
      catch (_) { return fallback; }
    },
    append(key, snapshot, parse, limit) {
      const max = Number.isFinite(Number(limit)) ? Number(limit) : 30;
      let history = root.history.read(key, parse, []);
      if (!Array.isArray(history)) history = [];
      const last = history[history.length - 1];
      if (!last || last.date !== snapshot.date) history.push(snapshot);
      if (history.length > max) history = history.slice(-max);
      try { localStorage.setItem(key, JSON.stringify(history)); } catch (_) {}
      return history;
    }
  };
  root.detail = {
    clampRay(ray, count) {
      const max = Math.max(0, Number(count) - 1);
      return root.clamp(Number(ray) || 0, 0, max);
    },
    buildUrl(base, parent, ray, label, back) {
      const url = new URL(base, location.href);
      url.searchParams.set("parent", parent);
      url.searchParams.set("ray", String(ray));
      url.searchParams.set("label", label);
      if (back) url.searchParams.set("back", back);
      return url.toString();
    }
  };
  root.ready = true;
})();
