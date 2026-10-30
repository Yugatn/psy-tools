/* Wheel Offline Coach v0.1 — structured self-reflection, not AI or psychotherapy.
 * No network, no persistence and no personal-data transfer. All text is user supplied.
 * The user may explicitly write a summary to an existing wheel goal afterward.
 */
(function (root) {
  "use strict";
  const CATALOG = Object.freeze([
    {id:"main",title:"Колесо баланса",key:"wheelBalanceV3Values",href:"./",rays:["Здоровье","Работа и карьера","Финансы","Отношения и семья","Друзья и общение","Личное развитие","Отдых и восстановление","Творчество и самореализация","Самоощущение и саморефлексия"]},
    {id:"health",title:"Здоровье",key:"wheelNestedV2_health_Values",href:"./health/",rays:["Питание","Сон","Физическая активность","Самочувствие","Профилактика","Лечение и медицинская помощь","Энергия","Телесный комфорт"]},
    {id:"work",title:"Работа",key:"wheelNestedV2_work_Values",href:"./work/",rays:["Содержание работы","Заработок","Руководство","Коллеги","Рабочее время","Нагрузка","Карьерный рост","Профессиональное развитие"]},
    {id:"finance",title:"Финансы",key:"wheelNestedV2_finance_Values",href:"./finance/",rays:["Доход","Расходы","Финансовая устойчивость","Накопления","Долги и обязательства","Жильё и бытовые расходы","Финансовое планирование","Свобода выбора"]},
    {id:"relationships",title:"Отношения",key:"wheelNestedV2_relationships_Values",href:"./relationships/",rays:["Близость","Доверие","Общение","Поддержка","Совместное время","Конфликты и их разрешение","Границы","Общие планы"]},
    {id:"social",title:"Социальная жизнь",key:"wheelNestedV2_social_Values",href:"./social/",rays:["Близкие друзья","Качество общения","Поддержка","Новые знакомства","Социальная активность","Принадлежность","Личные границы","Баланс общения и уединения"]},
    {id:"development",title:"Развитие",key:"wheelNestedV2_development_Values",href:"./development/",rays:["Обучение","Навыки","Интеллектуальное развитие","Самодисциплина","Цели","Практика","Любознательность","Результаты"]},
    {id:"rest",title:"Отдых",key:"wheelNestedV2_rest_Values",href:"./rest/",rays:["Сон","Паузы","Свободное время","Расслабление","Природа и прогулки","Развлечения","Уединение","Восстановление энергии"]},
    {id:"creativity",title:"Творчество",key:"wheelNestedV2_creativity_Values",href:"./creativity/",rays:["Идеи","Творческая практика","Самовыражение","Вдохновение","Свобода эксперимента","Признание результата","Реализация проектов","Смысл"]},
    {id:"self_awareness",title:"Самоосознание",key:"wheelBalanceSelfAwarenessValues",href:"./self_awareness/",rays:["Комфорт тела","Принятие себя","Позитивное мышление","Память","Эмоциональные реакции","Внимание и осознанность","Внутреннее спокойствие","Контакт с потребностями"]},
    {id:"sexuality",title:"Сексуальность",key:"wheelSexualityV3Values",href:"./sexuality/",rays:["Влечение к партнёру противоположного пола","Сексуальность","Сексуальное желание","Сексуальное самопринятие","Привлекательность партнёра","Интимная близость","Сексуальное общение","Взаимность и согласие","Удовлетворённость интимной жизнью","Сексуальное здоровье и безопасность"]},
    {id:"fear",title:"Страхи",key:"wheelFearV3Values",href:"./fear/",rays:["Страх смерти","Страх неудачи","Страх успеха","Страх богатства","Страх бедности","Страх независимости","Страх свободы","Страх перемен","Страх осуждения","Страх одиночества","Страх ответственности","Страх неизвестности"]},
    {id:"destructiveness",title:"Деструктивность",key:"wheelDestructivenessV3Values",href:"./destructiveness/",rays:["Негативное мышление","Мысли о разрушении","Мысли о причинении вреда другим","Злорадство","Раздражение и враждебность","Желание наказать","Саморазрушительные мысли","Саботаж собственных целей","Разрушение отношений","Потеря контроля над деструктивными импульсами"]}
  ]);
  const DETAIL_RAYS = ["Удовлетворённость","Качество","Регулярность","Ресурс","Свобода выбора","Возможность улучшения","Поддержка","Перспектива"];
  const PROMPTS = Object.freeze({
    reflection: [
      "Какие наблюдения или события связаны для вас с этой оценкой? Можно не раскрывать личные подробности.",
      "Что в этой ситуации вы знаете точно, а что остаётся неизвестным?",
      "Какие чувства и потребности вы замечаете? Можно пропустить вопрос.",
      "Что уже помогает вам справляться или сохранять важное?",
      "Какое понимание вы хотели бы сохранить из этого размышления?"
    ],
    reframe: [
      "Опишите обстоятельства, связанные с выбранной оценкой. Что произошло в действительности?",
      "Какую мысль или интерпретацию вы связываете с этой ситуацией?",
      "Что подтверждает эту мысль, а что могло бы ей противоречить?",
      "Какая ещё интерпретация возможна, не отрицая реальных трудностей? Можно сохранить исходный взгляд.",
      "Как можно безопасно проверить альтернативу? Ничего менять тоже допустимо."
    ],
    coaching: [
      "Что вы сами хотите изменить или сохранить в этой сфере? Отсутствие изменений — тоже выбор.",
      "Какую ситуацию вы наблюдаете сейчас и что пока лишь предполагаете?",
      "Какие ресурсы уже доступны и чего, возможно, не хватает?",
      "Какие два возможных действия вы видите, включая возможность не предпринимать ничего?",
      "Какой один небольшой и безопасный шаг вы хотели бы выбрать?",
      "Когда и по какому наблюдаемому признаку вы сами решите оценить результат?"
    ]
  });
  const MODES = Object.freeze({reflection:"Саморефлексия",reframe:"Рефрейминг",coaching:"Коучинг"});
  function score(value) {
    if (value === null || value === undefined || typeof value === "boolean") return null;
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 10 ? number : null;
  }
  function readList(storage) {
    const result=[];
    function add(item) {
      let raw;
      try { raw=storage.getItem(item.key); } catch (_) { return; }
      if (!raw) return;
      let values;
      try { values=JSON.parse(raw); } catch (_) { return; }
      if (!Array.isArray(values) || values.length !== item.rays.length) return;
      const rays=item.rays.map((name,i)=>({index:i,name,score:score(values[i])}));
      if (rays.some(r=>r.score!==null)) result.push({...item,rays});
    }
    CATALOG.forEach(add);
    const prefix="wheelBalanceDetail:";
    try {
      for (let i=0;i<storage.length;i++) {
        const key=storage.key(i);
        if (typeof key!=="string" || !key.startsWith(prefix) || !key.endsWith(":values")) continue;
        let name;
        try {
          const decoded=decodeURIComponent(key.slice(prefix.length,-":values".length));
          name=decoded.slice(decoded.indexOf(":")+1).split(" / ").filter(Boolean).pop();
        } catch (_) { continue; }
        if (!name) continue;
        add({id:key,title:"Детальное колесо: "+name.slice(0,180),key,href:"./hub.html",rays:DETAIL_RAYS});
      }
    } catch (_) {}
    return result;
  }
  function improvementsKey(key) {
    if (typeof key!=="string") return null;
    if (key.startsWith("wheelBalanceDetail:") && key.endsWith(":values")) return key.slice(0,-7)+":improvements";
    if (CATALOG.some(item=>item.key===key)) return key.replace(/Values$/,"Improvements").replace(/_Improvements$/,"_Improvements");
    return null;
  }
  function begin(item,index,mode) {
    if (!item || !Array.isArray(item.rays) || !item.rays[index] || !Object.hasOwn(MODES,mode)) throw Error("Недопустимый контекст сессии");
    return {mode,key:item.key,title:item.title,ray:{...item.rays[index]},stage:0,answers:[]};
  }
  function prompt(session) {
    if (!session || !Object.hasOwn(PROMPTS,session.mode)) return null;
    return PROMPTS[session.mode][session.stage] || null;
  }
  function answer(session,text) {
    if (!prompt(session)) throw Error("Сессия уже завершена");
    if (typeof text!=="string" || !text.trim() || text.trim().length>2000) throw Error("Ответ должен содержать от 1 до 2000 символов");
    return { ...session, stage:session.stage+1, answers:[...session.answers,text.trim()] };
  }
  function skip(session) {
    if (!prompt(session)) throw Error("Сессия уже завершена");
    return { ...session,stage:session.stage+1,answers:[...session.answers,null] };
  }
  function complete(session) { return session && !prompt(session); }
  function summary(session) {
    if (!complete(session)) throw Error("Сессия не завершена");
    const a=["Колесо баланса — самостоятельная рефлексия", "Колесо: "+session.title,
      "Сфера: "+session.ray.name,"Оценка: "+(session.ray.score===null?"не оценено":session.ray.score+"/10"),
      "Режим: "+MODES[session.mode], ""];
    PROMPTS[session.mode].forEach((q,i)=>{a.push(q);a.push(session.answers[i]===null?"[Пропущено]":session.answers[i]);a.push("");});
    a.push("Выводы сформулированы субъектом самостоятельно. Диалог не является диагностикой или психотерапией.");
    return a.join("\n");
  }
  const api=Object.freeze({catalog:CATALOG,modes:MODES,score,readList,improvementsKey,begin,prompt,answer,skip,complete,summary});
  root.WheelOfflineCoach=api;
  if (typeof module!=="undefined" && module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
