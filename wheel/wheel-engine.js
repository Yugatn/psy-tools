/* Wheel Engine — shared compatibility layer
 * Pages remain self-contained. This module stabilises APIs used by main, sphere and detail wheels.
 * v1.1.0 — null/unrated model, safer average, detail URLs with parentCount/trail.
 */
(function () {
  "use strict";
  const root = window.WheelEngine = window.WheelEngine || {};
  root.version = "1.1.0";

  root.clamp = function (value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  /** True when the user has explicitly set a 0–10 score (not empty/unrated). */
  root.isRated = function (value) {
    if (value === null || value === undefined || value === "") return false;
    return Number.isFinite(Number(value));
  };

  root.ratedValues = function (values) {
    if (!Array.isArray(values)) return [];
    return values.filter(root.isRated).map(Number);
  };

  root.average = function (values) {
    const rated = root.ratedValues(values);
    if (!rated.length) return 0;
    return rated.reduce(function (sum, value) { return sum + value; }, 0) / rated.length;
  };

  root.parseJSON = function (value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  };

  /**
   * Normalize a values array to fixed length.
   * Pass fallback=null for the unrated model (first open / missing slots).
   * Pass a number (legacy) to fill missing slots with that score.
   */
  root.normalizeValues = function (values, length, fallback) {
    const source = Array.isArray(values) ? values : [];
    const useNull = fallback === null || fallback === undefined;
    const base = useNull ? null : root.clamp(Number(fallback), 0, 10);
    return Array.from({ length: length }, function (_, index) {
      const raw = source[index];
      if (raw === null || raw === undefined || raw === "") return base;
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
      const max = Math.max(0, Number(count) - 1);
      return root.clamp(Number(ray) || 0, 0, max);
    },
    /** parentCount defaults to 9 (main wheel ray count). trail optional array of labels. */
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
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#39;");
  };

  root.ready = true;
})();
