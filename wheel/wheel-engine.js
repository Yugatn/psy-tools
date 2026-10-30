/* Wheel Engine — shared compatibility layer
 * Pages remain self-contained. This module stabilises APIs used by main, sphere and detail wheels.
 * v1.1.1 — null/unrated model, safer average, detail URLs with parentCount/trail, fixed escapeHtml.
 */
(function () {
  "use strict";
  const root = window.WheelEngine = window.WheelEngine || {};
  root.version = "1.2.0";

  root.clamp = function (value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  // Null and missing values are not scores. Zero, however, is a valid score.
  root.isRated = function (value) {
    if (value === null || value === undefined || typeof value === "boolean") return false;
    if (typeof value !== "number" && typeof value !== "string") return false;
    if (typeof value === "string" && !value.trim()) return false;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 10;
  };

  root.ratedValues = function (values) {
    if (!Array.isArray(values)) return [];
    return values.filter(root.isRated).map(Number);
  };

  root.average = function (values) {
    const rated = root.ratedValues(values);
    if (!rated.length) return 0; // Compatibility for legacy callers; use statistics() for unrated UI.
    return rated.reduce(function (sum, value) { return sum + value; }, 0) / rated.length;
  };

  root.statistics = function (values) {
    const input = Array.isArray(values) ? values : [];
    const entries = input.map(function (value, index) {
      return root.isRated(value) ? { index: index, value: Number(value) } : null;
    }).filter(Boolean);
    if (!entries.length) return {
      count: 0, total: input.length, mean: null, min: null, max: null, gap: null, lowestIndices: []
    };
    const scores = entries.map(function (entry) { return entry.value; });
    const min = Math.min.apply(null, scores);
    const max = Math.max.apply(null, scores);
    return {
      count: entries.length,
      total: input.length,
      mean: scores.reduce(function (a, b) { return a + b; }, 0) / scores.length,
      min: min, max: max, gap: max - min,
      lowestIndices: entries.filter(function (entry) { return entry.value === min; })
        .map(function (entry) { return entry.index; })
    };
  };

  root.parseJSON = function (value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  };

  root.normalizeValues = function (values, length, fallback) {
    const source = Array.isArray(values) ? values : [];
    const useNull = fallback === null || fallback === undefined;
    const base = useNull ? null : root.clamp(Number(fallback), 0, 10);
    return Array.from({ length: length }, function (_, index) {
      const raw = source[index];
      if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") return base;
      if (typeof raw !== "number" && typeof raw !== "string") return base;
      if (typeof raw === "string" && !raw.trim()) return base;
      const n = Number(raw);
      if (!Number.isFinite(n)) return base;
      return root.clamp(n, 0, 10);
    });
  };

  root.history = {
    read: function (key, parse, fallback) {
      try { return parse(localStorage.getItem(key) || "[]", fallback); }
      catch (_) { return fallback; }
    },
    append: function (key, snapshot, parse, limit) {
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
    clampRay: function (ray, count) {
      const max = Math.max(0, Math.trunc(Number(count) || 1) - 1);
      return Math.trunc(root.clamp(Number(ray) || 0, 0, max));
    },
    buildUrl: function (base, parent, ray, label, back, parentCount, trail) {
      const url = new URL(base, location.href);
      url.searchParams.set("parent", parent);
      url.searchParams.set("ray", String(ray));
      url.searchParams.set("label", label);
      url.searchParams.set("parentCount", String(Number(parentCount) || 9));
      if (back) url.searchParams.set("back", back);
      if (Array.isArray(trail) && trail.length) {
        url.searchParams.set("trail", JSON.stringify(trail.slice(0, 20)));
      }
      return url.toString();
    }
  };

  root.escapeHtml = function (str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  root.ready = true;
})();
