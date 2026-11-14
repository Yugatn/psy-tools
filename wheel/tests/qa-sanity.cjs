/** PSY-TOOLS GitHub Pages QA document integrity.
 * Run from repository root: node wheel/tests/qa-sanity.cjs
 * This is a source check; live HTTP checks run from wheel/qa.html.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..","..");
const qa=fs.readFileSync(path.join(root,"wheel","qa.html"),"utf8");
const match=qa.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script defer src="\/psy-tools\/wheel\/wheel-nav\.js"/);
assert.ok(match,"QA controller present");
new vm.Script(match[1],{filename:"wheel/qa.html"});
const matchSpecs=[...match[1].matchAll(/\{path:"([^"]+)",kind:"([^"]+)"(?:,ids:\[([^\]]+)\])?\}/g)];
assert.equal(matchSpecs.length,23,"exactly 23 QA routes");
const paths=matchSpecs.map(m=>m[1]);
assert.equal(new Set(paths).size,23,"all route paths unique");
assert.ok(paths.includes("dependencies/"),"habits included");
assert.ok(paths.includes("virtues/detail.html"),"nested virtues included");
assert.ok(paths.includes("custom/"),"constructor included");
assert.ok(paths.includes("soft-skills/"),"children included");
assert.ok(paths.includes("qa.html"),"QA self-check included");
const basicIds=["wheel","resultSection","resultsChart","pngBtn","exportJsonBtn","importJsonBtn","journal","addPlanBtn","improvementsList"];
let pagesChecked=0;
for(const m of matchSpecs){
  const [_,publicPath,kind,idLiteral]=m;
  const relative="wheel/"+(publicPath.endsWith("/")?publicPath+"index.html":publicPath);
  const full=path.join(root,relative);
  assert.ok(fs.existsSync(full),"missing file for "+relative);
  const source=fs.readFileSync(full,"utf8");
  assert.match(source,/<\/body>/i,"missing closing body: "+relative);
  assert.match(source,/wheel-nav\.js/,"missing shared navigation: "+relative);
  const ids=idLiteral?[...idLiteral.matchAll(/"([^"]+)"/g)].map(a=>a[1]):basicIds;
  for(const id of ids)assert.ok(source.includes('id="'+id+'"'),relative+": required ID "+id+" not found");
  for(const m of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
    if(m[1].includes("src=")||!m[2].trim())continue;
    new vm.Script(m[2],{filename:relative});
  }
  pagesChecked++;
}
for(const f of ["wheel/dependencies/catalog.js","wheel/custom/catalog.js","wheel/virtues/data.js","wheel/wheel-nav.js","wheel/nine-streams/model.js"]){
  const full=path.join(root,f);assert.ok(fs.existsSync(full),"missing local JS "+f);new vm.Script(fs.readFileSync(full,"utf8"),{filename:f});
}
for(const f of ["wheel/wheel-engine.js","wheel/wheel-draw.js"]){
  assert.ok(fs.existsSync(path.join(root,f)),"missing classic JS "+f);
}
console.log("PASS: QA route catalogue covers "+pagesChecked+" HTML pages, required elements and core scripts");
