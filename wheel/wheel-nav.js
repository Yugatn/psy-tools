/* PSY-TOOLS: global cross-wheel navigation. Copyright (c) 2026 Югатн (Yugatn). */
(function() {
  "use strict";
  if (typeof document === "undefined") return;
  const sections=[
    ["Начало", [
      ["Все колёса", "/psy-tools/wheel/hub.html"],
      ["Личный кабинет", "/psy-tools/wheel/cabinet.html"],
      ["Основное колесо", "/psy-tools/wheel/"],
      ["Своё колесо · конструктор", "/psy-tools/wheel/custom/"]
    ]],
    ["Сферы жизни", [
      ["Здоровье", "/psy-tools/wheel/health/"],
      ["Работа", "/psy-tools/wheel/work/"],
      ["Финансы", "/psy-tools/wheel/finance/"],
      ["Отношения", "/psy-tools/wheel/relationships/"],
      ["Социальная жизнь", "/psy-tools/wheel/social/"],
      ["Развитие", "/psy-tools/wheel/development/"],
      ["Отдых", "/psy-tools/wheel/rest/"],
      ["Творчество", "/psy-tools/wheel/creativity/"],
      ["Самоосознание", "/psy-tools/wheel/self_awareness/"]
    ]],
    ["Тематические", [
      ["Гибкие навыки детей", "/psy-tools/wheel/soft-skills/"],
      ["Матрица девяти потоков", "/psy-tools/wheel/nine-streams/"],
      ["Страхи", "/psy-tools/wheel/fear/"],
      ["Сексуальность", "/psy-tools/wheel/sexuality/"],
      ["Деструктивность", "/psy-tools/wheel/destructiveness/"]
    ]]
  ];
  function mount(){
    if (document.getElementById("psyWheelQuickNav")) return;
    const style=document.createElement("style");
    style.textContent=[
      "#psyWheelQuickNav{position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));right:14px;z-index:2147480000;color:#eaf5ff;font:14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}",
      "#psyWheelQuickNav *{box-sizing:border-box}",
      "#psyWheelQuickNav details{position:relative}",
      "#psyWheelQuickNav summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:46px;padding:10px 15px;background:#216e64;color:#fff;border:2px solid #78ddd1;border-radius:99px;box-shadow:0 6px 22px #0009;font-weight:760;user-select:none}",
      "#psyWheelQuickNav summary::-webkit-details-marker{display:none}",
      "#psyWheelQuickNav summary:focus-visible,#psyWheelQuickNav a:focus-visible{outline:3px solid #f4d583;outline-offset:3px}",
      "#psyWheelQuickNav .wheels-panel{position:absolute;bottom:calc(100% + 9px);right:0;width:min(318px,calc(100vw - 28px));max-height:min(68vh,580px);overflow:auto;overscroll-behavior:contain;background:#101d30;color:#eaf5ff;border:1px solid #4a627a;border-radius:16px;padding:11px 13px;box-shadow:0 20px 65px #000c}",
      "#psyWheelQuickNav h2{margin:12px 4px 7px!important;color:#9edbd4!important;font:bold 12px/1.25 system-ui,sans-serif!important;text-transform:uppercase!important;letter-spacing:.04em!important;text-align:left!important}",
      "#psyWheelQuickNav h2:first-child{margin-top:3px!important}",
      "#psyWheelQuickNav a{display:block!important;font:14px/1.36 system-ui,sans-serif!important;text-decoration:none!important;padding:9px 11px!important;color:#eaf5ff!important;background:transparent!important;border:0!important;border-radius:9px!important;transform:none!important;width:auto!important;height:auto!important;position:static!important;box-shadow:none!important}",
      "#psyWheelQuickNav a:hover,#psyWheelQuickNav a[aria-current=page]{background:#263e55!important;color:#fff!important}",
      "@media print{#psyWheelQuickNav{display:none!important}}"
    ].join("\n");
    document.head.appendChild(style);
    const nav=document.createElement("nav");nav.id="psyWheelQuickNav";nav.setAttribute("aria-label","Переход к другим колёсам баланса");
    const details=document.createElement("details");const summary=document.createElement("summary");summary.textContent="☷ Другие колёса";details.appendChild(summary);
    const panel=document.createElement("div");panel.className="wheels-panel";const current=location.pathname.replace(/index\.html$/,"");
    for (const [heading,links] of sections) {
      const title=document.createElement("h2");title.textContent=heading;panel.appendChild(title);
      for (const [label,url] of links) {
        const a=document.createElement("a");a.href=url;a.textContent=label;
        const normalized=url.replace(/index\.html$/,"");
        if (current===normalized) a.setAttribute("aria-current","page");
        panel.appendChild(a);
      }
    }
    details.appendChild(panel);nav.appendChild(details);document.body.appendChild(nav);
    document.addEventListener("pointerdown",event=>{if(details.open&&!nav.contains(event.target))details.open=false});
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&details.open){details.open=false;summary.focus()}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
