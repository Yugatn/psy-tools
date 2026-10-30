// Run with: node --test wheel/tests/wheel-engine.test.js
// Static and isolated-unit coverage. These are NOT substitutes for browser/mobile QA.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const WHEEL = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(WHEEL, name), "utf8");
const scores = new Map();
const storage = {
  getItem: key => scores.has(key) ? scores.get(key) : null,
  setItem: (key, value) => scores.set(key, String(value))
};
const browser = { window: {}, location: { href: "https://example.test/wheel/index.html" }, localStorage: storage, URL, URLSearchParams };
vm.createContext(browser);
vm.runInContext(read("wheel-engine.js"), browser, { filename: "wheel-engine.js" });
const E = browser.window.WheelEngine;

test("unrated never silently becomes a score; zero is rated", () => {
  for (const value of [null, undefined, "", " ", false, true, NaN, Infinity, -1, 11, "bad", {}]) {
    assert.equal(E.isRated(value), false, String(value));
  }
  assert.equal(E.isRated(0), true);
  assert.equal(E.isRated("0"), true);
  assert.equal(E.isRated(10), true);
});

test("partial statistics ignore unrated values and preserve zero", () => {
  const empty = E.statistics([null, null, null]);
  assert.equal(empty.mean, null);
  assert.equal(empty.min, null);
  assert.equal(empty.max, null);
  assert.equal(empty.gap, null);
  assert.equal(empty.count, 0);
  const partial = E.statistics([null, 0, 10, null, 0]);
  assert.equal(partial.mean, 10 / 3);
  assert.equal(partial.count, 3);
  assert.equal(partial.min, 0);
  assert.equal(partial.max, 10);
  assert.equal(partial.gap, 10);
  assert.deepEqual(Array.from(partial.lowestIndices), [1, 4]);
});

test("normalizeValues preserves null and clamps only supplied numbers", () => {
  assert.deepEqual(Array.from(E.normalizeValues([null, "", 0, "10", " ", false, 13, "bad"], 8, null)),
    [null, null, 0, 10, null, null, 10, null]);
  assert.deepEqual(Array.from(E.normalizeValues(null, 3, null)), [null, null, null]);
});

test("detail ray clamp and URL context survive encoding", () => {
  assert.equal(E.detail.clampRay("1.9", 8), 1);
  assert.equal(E.detail.clampRay("999", 8), 7);
  assert.equal(E.detail.clampRay(-5, 8), 0);
  const link = new URL(E.detail.buildUrl("detail/", "health", 2, "Свобода выбора", "https://example.test/back", 8, ["Здоровье", "Свобода выбора"]));
  assert.equal(link.searchParams.get("parent"), "health");
  assert.equal(link.searchParams.get("ray"), "2");
  assert.equal(link.searchParams.get("parentCount"), "8");
  assert.equal(link.searchParams.get("label"), "Свобода выбора");
  assert.deepEqual(JSON.parse(link.searchParams.get("trail")), ["Здоровье", "Свобода выбора"]);
});

test("HTML string escape does not treat imported text as markup", () => {
  assert.equal(E.escapeHtml('<"&\''), "&lt;&quot;&amp;&#39;");
});

const dirs = ["", "detail/", "health/", "work/", "finance/", "relationships/", "social/",
  "development/", "rest/", "creativity/", "self_awareness/", "sexuality/", "fear/", "destructiveness/"];
test("all 14 existing wheel pages parse and use scoped import/score logic", () => {
  for (const dir of dirs) {
    const relative = dir + "index.html";
    const html = read(relative);
    const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
    assert.ok(inline.length, relative + ": no inline script");
    for (const code of inline) new vm.Script(code, { filename: relative });
    assert.match(html, /wheel-engine\.js/, relative);
    assert.match(html, /wheel-draw\.js/, relative);
    assert.match(html, /wheelId: VALUES_KEY/, relative);
    assert.match(html, /WheelEngine\.statistics\(values\)/, relative);
    assert.match(html, /Файл предназначен для другого колеса/, relative);
    assert.doesNotMatch(html, /Сбросить все оценки этого колеса к 5/, relative);
    assert.doesNotMatch(html, /const scaleX = canvas\.width \/ rect\.width/, relative);
  }
});

function mockCtx() {
  const texts = [];
  const target = {
    texts,
    measureText: text => ({ width: String(text).length * 8 }),
    fillText: text => texts.push(String(text))
  };
  return new Proxy(target, {
    get(obj, key) { return key in obj ? obj[key] : () => {}; },
    set(obj, key, value) { obj[key] = value; return true; }
  });
}
function mockCanvas() {
  const context = mockCtx();
  return { width: 0, height: 0, style: {}, context, getContext() { return context; } };
}
const canvas = mockCanvas();
browser.document = {
  getElementById: id => id === "wheelStage" ? { clientWidth: 400 } : null,
  createElement: () => mockCanvas()
};
browser.window.devicePixelRatio = 2;
vm.runInContext(read("wheel-draw.js"), browser, { filename: "wheel-draw.js" });

test("Canvas displays unrated markers without fictional null scores", () => {
  const hits = browser.window.WheelCanvas.draw(canvas, [null, null, null], {}, ["А", "Б", "В"]);
  assert.equal(hits.length, 3);
  assert.equal(canvas.width, 800); // Retina backing store
  assert.equal(canvas.style.width, "400px"); // click coordinates remain CSS pixels
  assert.ok(canvas.context.texts.includes("—"));
  assert.ok(!canvas.context.texts.includes("null"));
});

test("Canvas renders partial, zero, complete and goal profiles", () => {
  let hits = browser.window.WheelCanvas.draw(canvas, [0, null, 7], {}, ["А", "Б", "В"]);
  assert.equal(hits.length, 3);
  hits = browser.window.WheelCanvas.draw(canvas, [0, 4, 7], {1:{target:8}}, ["А", "Б", "В"]);
  assert.ok(hits.length >= 4);
});
