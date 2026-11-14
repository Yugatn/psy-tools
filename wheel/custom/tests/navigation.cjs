// Repo-root navigation integrity checks. Run: node wheel/custom/tests/navigation.cjs
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.join(__dirname,"..","..","..");
const pages=[
"wheel/index.html","wheel/hub.html","wheel/cabinet.html","wheel/detail/index.html",
"wheel/health/index.html","wheel/work/index.html","wheel/finance/index.html",
"wheel/relationships/index.html","wheel/social/index.html","wheel/development/index.html",
"wheel/rest/index.html","wheel/creativity/index.html","wheel/self_awareness/index.html",
"wheel/fear/index.html","wheel/sexuality/index.html","wheel/destructiveness/index.html",
"wheel/soft-skills/index.html","wheel/nine-streams/index.html","wheel/custom/index.html",
"wheel/virtues/index.html","wheel/virtues/detail.html","wheel/dependencies/index.html"
];
const nav=fs.readFileSync(path.join(root,"wheel/wheel-nav.js"),"utf8");
new vm.Script(nav);
const license=fs.readFileSync(path.join(root,"LICENSE"),"utf8");
assert.match(license,/All rights reserved/i);
for(const page of pages){
  const html=fs.readFileSync(path.join(root,page),"utf8");
  assert.match(html,/wheel-nav\.js/,page+": missing navigation");
  assert.match(html,/<\/body>/i,page+": missing closing body");
}
for(const route of [
"/psy-tools/wheel/hub.html","/psy-tools/wheel/","/psy-tools/wheel/custom/",
"/psy-tools/wheel/soft-skills/","/psy-tools/wheel/nine-streams/","/psy-tools/wheel/virtues/","/psy-tools/wheel/dependencies/"
])assert.ok(nav.includes(route),"Navigation missing "+route);
console.log("PASS: navigation installed on "+pages.length+" wheels/pages; license and JS verified");
