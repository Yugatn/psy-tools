/* Adaptive Skill Trainer UI v1.1. Local first; no tracking, no external API. */
(() => {
  "use strict";
  const data = globalThis.AdaptiveSkillData;
  const core = globalThis.AdaptiveSkillCore;
  const learning = globalThis.AdaptiveSkillLearning;
  const $ = id => document.getElementById(id);
  const STORE = "psyToolsAdaptiveTrainerStateV1"; // retained for seamless v1 upgrade
  const ENABLED = "psyToolsAdaptiveTrainerSaveEnabledV1";
  const JOURNAL = "psyToolsAdaptiveTrainerJournalV1";
  if (!data || !core || !learning || !core.validateCurriculum(data)) {
    $("status").textContent = "Учебный набор не загрузился или содержит ошибку."; return;
  }
  const ageSelect = $("age"), skillSelect = $("skill"), saveSwitch = $("save");
  let state = core.freshState(), journal = learning.freshJournal();
  let saveEnabled = false, currentId = data.scenarios[0].id;
  function make(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function notice(text) { $("status").textContent = text; }
  function dateToday() { return learning.dayOf(new Date()); }
  function store() {
    if (!saveEnabled) return;
    try {
      localStorage.setItem(STORE, core.safeJSON(state, data));
      localStorage.setItem(JOURNAL, JSON.stringify(learning.normalizeJournal(journal, data)));
      localStorage.setItem(ENABLED, "1");
    } catch (_) { notice("Не удалось записать данные. Можно экспортировать резервную копию JSON."); }
  }
  function clearStored() {
    try {
      localStorage.removeItem(STORE); localStorage.removeItem(JOURNAL);
      localStorage.removeItem(ENABLED);
    } catch (_) { notice("Удаление из браузерного хранилища запрещено. Очистите данные сайта вручную."); }
  }
  try {
    saveEnabled = localStorage.getItem(ENABLED) === "1";
    if (saveEnabled) {
      const old = localStorage.getItem(STORE);
      if (old) state = core.normalizeState(JSON.parse(old), data);
      const log = localStorage.getItem(JOURNAL);
      if (log) {
        try { journal = learning.normalizeJournal(JSON.parse(log), data); }
        catch (_) {
          journal = learning.freshJournal();
          notice("Повреждён журнал повторений. Старые ответы сохранены; экспортируйте резервную копию.");
        }
      }
    }
  } catch (_) {
    saveEnabled = false; state = core.freshState(); journal = learning.freshJournal();
    notice("Невозможно прочитать сохранённую историю. Начата временная сессия; старые данные не удалены.");
  }
  saveSwitch.checked = saveEnabled;
  data.ages.forEach(item => {
    const option = make("option", "", item.label); option.value = item.id; ageSelect.append(option);
  });
  data.skills.forEach(item => {
    const option = make("option", "", item.label); option.value = item.id; skillSelect.append(option);
  });
  function visibleRows() {
    return data.scenarios.filter(item =>
      item.age === ageSelect.value && (!skillSelect.value || item.skill === skillSelect.value));
  }
  function responseFor(id) { return state.responses[id] || null; }
  function stageFor(item) { return learning.learningStatus(item, responseFor(item.id), journal); }
  function renderSummary() {
    const selection = learning.stats(state, journal, data, ageSelect.value, skillSelect.value);
    $("summary").textContent = "Не начато: " + selection.notStarted + " · В процессе: " + selection.inProgress +
      " · Закреплено (самоотчёт): " + selection.reinforced + " · Всего: " + selection.total;
    $("progressBar").max = Math.max(1, selection.total);
    $("progressBar").value = selection.reinforced;
    $("progressLabel").textContent = selection.total ?
      selection.reinforced + " из " + selection.total + " с повторной практикой" : "Нет упражнений";
    const age = data.ages.find(item => item.id === ageSelect.value);
    $("ageHelp").textContent = age ? age.helper : "";
    $("privacyMode").textContent = saveEnabled ?
      "Сохранение включено. Любой пользователь этого профиля браузера может прочитать историю." :
      "Временная сессия без постоянного сохранения; обновление страницы обычно сбрасывает записи.";
  }
  function renderList() {
    const panel = $("exerciseList"); panel.replaceChildren();
    visibleRows().forEach(item => {
      const status = stageFor(item);
      const due = learning.isDue(item, responseFor(item.id), journal, dateToday());
      const button = make("button", "exercise-item" + (currentId === item.id ? " selected" : ""), item.title);
      button.type = "button";
      button.setAttribute("aria-current", currentId === item.id ? "true" : "false");
      button.append(make("span", "mini-status", due ? "Повторить" : status));
      button.addEventListener("click", () => { currentId = item.id; render(); $("scenario").focus(); });
      panel.append(button);
    });
    if (!panel.childElementCount) panel.textContent = "В этой программе пока нет упражнений по выбранному навыку.";
  }
  function itemsList(parent, heading, lines) {
    const section = make("section", "subsection");
    section.append(make("h3", "", heading));
    const list = make("ul");
    lines.forEach(line => list.append(make("li", "", line)));
    section.append(list); parent.append(section);
  }
  function rating(labelText, value) {
    const wrapper = make("label", "field");
    wrapper.append(make("span", "", labelText));
    const select = make("select");
    const unknown = make("option", "", "Не оцениваю"); unknown.value = ""; select.append(unknown);
    for (let i=1;i<=5;i++) {
      const option = make("option", "", i + (i===1 ? " · пока трудно" : i===5 ? " · уверенно" : ""));
      option.value = String(i); select.append(option);
    }
    select.value = value === null || value === undefined ? "" : String(value);
    wrapper.append(select);
    return {wrapper,select};
  }
  function renderScenario() {
    const panel = $("scenario"); panel.replaceChildren();
    const item = visibleRows().find(row => row.id === currentId);
    if (!item) { panel.append(make("p", "", "Выберите ситуацию слева.")); return; }
    const response = responseFor(item.id);
    const skill = data.skills.find(x => x.id === item.skill);
    panel.append(make("div", "eyebrow", skill.label + " · " + ageSelect.value));
    panel.append(make("p", "review-state", "Редакционный статус: " + learning.REVIEW.editorial +
      " · Научная проверка: " + learning.REVIEW.evidence));
    panel.append(make("h2", "", item.title));
    panel.append(make("p", "situation", item.situation));
    panel.append(make("p", "goal", "Цель: " + item.goal));
    panel.append(make("h3", "", "Шаг 1 · Как можно поступить?"));
    const options = make("div", "choices");
    item.options.forEach((option,index) => {
      const chosen = Boolean(response && response.option === index);
      const button = make("button", "choice" + (chosen ? " active" : ""), option.text);
      button.type = "button"; button.setAttribute("aria-pressed", chosen ? "true" : "false");
      button.addEventListener("click", () => {
        if (response && response.option !== index) {
          journal = learning.normalizeJournal(journal, data);
          delete journal.entries[item.id]; // New approach: start a new evidence trail.
        }
        state = core.answer(state, item.id, index, data);
        store(); render(); $("scenario").focus();
        notice("Решение выбрано. Прочитайте обратную связь и попробуйте действие в жизни.");
      });
      options.append(button);
    });
    panel.append(options);
    if (!response) {
      panel.append(make("p", "quiet", "Нет баллов за «хорошего человека»; любой ответ служит поводом исследовать последствия. Можно пропустить вопрос."));
      return;
    }
    const feedback = item.options[response.option];
    const explanation = make("section", "feedback " + feedback.type);
    explanation.append(make("strong", "", "Обсудим последствия"));
    explanation.append(make("p", "", feedback.feedback));
    panel.append(explanation);
    itemsList(panel, "Шаг 2 · Вопросы для размышления", item.questions);
    const practice = make("section", "practice");
    practice.append(make("h3", "", "Шаг 3 · Действие вне тренажёра"));
    practice.append(make("p", "", item.practice));
    practice.append(make("p", "helper", "Способ выбирает участник: устно, письменно, рисунком или через добровольную ролевую игру. Обсуждать личные подробности не обязательно."));
    const fieldset = make("fieldset", "indicators");
    fieldset.append(make("legend", "", "Что действительно получилось?"));
    const checks=[];
    item.criteria.forEach(criterion => {
      const label = make("label", "tick");
      const check = make("input"); check.type = "checkbox"; checks.push(check);
      label.append(check, make("span", "", criterion)); fieldset.append(label);
    });
    practice.append(fieldset);
    const history = journal.entries[item.id] || [];
    practice.append(make("p", "helper", history.length ?
      "Дни подтверждённой вами практики: " + history.map(row => row.day).join(", ") :
      "Повторения не записаны. «Закреплено» появится после двух выполнений всех критериев с интервалом от трёх дней."));
    const logButton=make("button", "secondary", "Записать практику за сегодня");
    logButton.type="button";
    logButton.addEventListener("click", () => {
      const met=checks.flatMap((check,i) => check.checked ? [i] : []);
      try {
        const nextJournal = learning.record(journal, data, item.id, met, dateToday());
        const nextState = core.practice(state, item.id, {
          practiced:true, note: response.note || "", before:response.before, after:response.after
        }, data);
        journal = nextJournal; state = nextState; store(); render();
        notice("Записано наблюдение за сегодня. Отметку можно исправить или отменить.");
      } catch (error) { notice(error.message); }
    });
    practice.append(logButton);
    const undo = make("button", "secondary", "Отменить последнюю запись");
    undo.type="button"; undo.disabled = history.length === 0;
    undo.addEventListener("click", () => {
      journal=learning.undoLast(journal,data,item.id); store(); render();
      notice("Последняя запись практики отменена.");
    });
    practice.append(undo);
    practice.append(make("p", "helper", "Один день засчитывается один раз. «Закреплено» — предварительный самоотчёт, а не подтверждение педагогом или диагноз."));
    practice.append(make("h3", "", "Шаг 4 · Рефлексия"));
    const noteLabel=make("label", "field");
    noteLabel.append(make("span", "", "Что получилось и что хотите попробовать иначе? (необязательно)"));
    const note=make("textarea", "reflection"); note.maxLength=core.MAX_NOTE; note.rows=3;
    note.placeholder="Без имён других людей и личных медицинских данных";
    note.value=response.note || ""; noteLabel.append(note); practice.append(noteLabel);
    const scale=make("div", "scale");
    const before=rating("До практики · субъективная уверенность",response.before);
    const after=rating("После практики · субъективная уверенность",response.after);
    scale.append(before.wrapper,after.wrapper); practice.append(scale);
    const applied=make("input"); applied.type="checkbox"; applied.checked=response.practiced;
    const label=make("label", "tick"); label.append(applied,make("span", "", "Я пробовал(а) действие вне тренажёра (самоотчёт, отдельно от журнала повторений)"));
    practice.append(label);
    const saveButton=make("button", "primary", "Сохранить рефлексию");
    saveButton.type="button";
    saveButton.addEventListener("click", () => {
      state=core.practice(state,item.id,{
        practiced:applied.checked,note:note.value,
        before:before.select.value ? Number(before.select.value) : null,
        after:after.select.value ? Number(after.select.value) : null
      },data);
      store();render();notice("Рефлексия обновлена. Для повторного закрепления используйте отдельную запись реальной практики.");
    });
    practice.append(saveButton);
    panel.append(practice);
    if (item.adult) panel.append(make("p","adult-tip","Для взрослого: " + item.adult));
    const next=make("button","secondary","Следующая ситуация");
    next.type="button";
    next.addEventListener("click",() => {
      const rows=visibleRows(), pos=rows.findIndex(row=>row.id===currentId);
      if (rows.length) { currentId=rows[(pos+1)%rows.length].id;render();panel.focus(); }
    });
    panel.append(next);
  }
  function render() {
    const rows=visibleRows();
    if (rows.length && !rows.some(row => row.id===currentId)) currentId=rows[0].id;
    renderSummary();renderList();renderScenario();
  }
  ageSelect.addEventListener("change",render);
  skillSelect.addEventListener("change",render);
  $("recommend").addEventListener("click",() => {
    const item=learning.recommend(state,journal,data,ageSelect.value,skillSelect.value,dateToday());
    if (item) { currentId=item.id;render();$("scenario").focus();notice("Выбран следующий шаг или повторение через несколько дней."); }
  });
  saveSwitch.addEventListener("change",() => {
    saveEnabled=saveSwitch.checked;
    if (saveEnabled) { store();notice("Сохранение включено только для этого профиля браузера."); }
    else { clearStored();notice("Постоянное сохранение выключено. Локальные записи удалены."); }
    renderSummary();
  });
  $("export").addEventListener("click",() => {
    const content=learning.exportBundle(state,journal,data,core);
    const url=URL.createObjectURL(new Blob([content],{type:"application/json;charset=utf-8"}));
    const anchor=document.createElement("a");
    anchor.href=url;anchor.download="adaptive-skill-trainer-v2.json";
    document.body.append(anchor);anchor.click();anchor.remove();
    // Defer revocation until browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url),1000);
    notice("Экспортирована история v2. Файл содержит рефлексии — храните его приватно.");
  });
  $("import").addEventListener("change",async event => {
    const file=event.target.files && event.target.files[0];if (!file) return;
    try {
      if (file.size>1000000) throw new Error("Размер файла больше 1 МБ");
      const restored=learning.importBundle(JSON.parse(await file.text()),data,core);
      if (!confirm("Заменить текущие ответы и историю практики содержимым файла?")) return;
      state=restored.state;journal=restored.journal;store();render();
      notice(restored.legacy ?
        "Формат v1 импортирован; ответы сохранены, но старые записи не считаются многодневным закреплением." :
        "Резервная копия v2 проверена и импортирована.");
    } catch (error) { notice("Импорт отклонён: " + error.message); }
    finally {event.target.value="";}
  });
  $("reset").addEventListener("click",() => {
    if (!confirm("Удалить все ответы, рефлексии и журнал повторений из сессии и локального хранилища?")) return;
    state=core.freshState();journal=learning.freshJournal();
    clearStored();saveEnabled=false;saveSwitch.checked=false;render();
    notice("Текущая история удалена.");
  });
  render();
})();
