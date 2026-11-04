const test = require("node:test");
const assert = require("node:assert/strict");

// The web-only compatibility layer must remain testable without a DOM or network.
global.window = {};
global.location = {href: "https://example.org/psy-tools/wheel/"};
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
};
require("../wheel/wheel-engine.js");
const engine = global.window.WheelEngine;

test("an unanswered ray is different from a zero rating", () => {
  assert.equal(engine.isRated(null), false);
  assert.equal(engine.isRated(undefined), false);
  assert.equal(engine.isRated(""), false);
  assert.equal(engine.isRated(0), true);
  assert.deepEqual(engine.normalizeValues([null, 0, 11, -2, "bad"], 5, null),
                   [null, 0, 10, 0, null]);
  assert.equal(engine.average([null, 0, 10, ""]), 5);
});

test("unrated groups cannot produce a fabricated average", () => {
  assert.deepEqual(engine.ratedValues([null, "", undefined]), []);
  assert.equal(engine.average([null, "", undefined]), 0);
  assert.equal(engine.clamp(Number.NaN, 0, 10), 0);
});

test("user text is escaped before insertion into HTML", () => {
  assert.equal(engine.escapeHtml('<img src="x" onerror=\'alert(1)\'>'),
               '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;');
});

test("detail links preserve user-provided labels as URL parameters", () => {
  const url = new URL(engine.detail.buildUrl("./detail/", "health", 2,
                                            "сон & отдых", "./", 12, []));
  assert.equal(url.searchParams.get("label"), "сон & отдых");
  assert.equal(url.searchParams.get("parent"), "health");
  assert.equal(url.searchParams.get("parentCount"), "12");
});
