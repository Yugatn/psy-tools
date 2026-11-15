/* Adaptive Skill Trainer UI. No tracking, server, external libraries or account. */
(() => {
  "use strict";
  const data = globalThis.AdaptiveSkillData;
  const core = globalThis.AdaptiveSkillCore;
  const $ = id => document.getElementById(id);
  const STORE = "psyToolsAdaptiveTrainerStateV1";
  const ENABLED = "psyToolsAdaptiveTrainerSaveEnabledV1";
  if (!data || !core || !core.validateCurriculum(data)) {
    $("status").textContent = "Учебный набор не загрузился или содержит ошибку."; return;
  }
  const ageSelect = $("age");
  const skillSelect = $("skill");
  const saveSwitch = $("save");
  let state = core.freshState();
  let saveEnabled = false;
  let currentId = data.scenarios[0].id;
  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function append(parent, ...children) { children.forEach(child => parent.append(child)); return parent; }
  function notice(message) { $("status").textContent = message; }
  function store() {
    if (!saveEnabled) return;
    try {
      localStorage.setItem(STORE, core.safeJSON(state, data));
      localStorage.setItem(ENABLED, "1");
    } catch (_) {
      notice("Не удалось записать данные в браузере. Можно экспортировать JSON.");
    }
  }
  function clearStored() {
    try { localStorage.removeItem(STORE); localStorage.removeItem(ENABLED); }
    catch (_) { notice("Браузер не разрешил удалить локальные данные. Очистите данные сайта вручную."); }
  }
  try {
    saveEnabled = localStorage.getItem(ENABLED) === "1";
    if (saveEnabled) {
      const saved = localStorage.getItem(STORE);
      if (saved) state = core.normalizeState(JSON.parse(saved), data);
    }
  } catch (_) { saveEnabled = false; state = core.freshState(); notice("Локальная история не прочитана. Работает временная сессия."); }
  saveSwitch.checked = saveEnabled;
  data.ages.forEach(item => {
    const option = make("option", "", item.label); option.value = item.id; ageSelect.append(option);
  });
  data.skills.forEach(item => {
    const option = make("option", "", item.label); option.value = item.id; skillSelect.append(option);
  });
  function visibleRows() {
    return data.scenarios.filter(item => item.age === ageSelect.value && (!skillSelect.value || item.skill === skillSelect.value));
  }
  function choice(id) { return state.responses[id] || null; }
  function renderSummary() {
    const selection = core.progress(state, data, ageSelect.value, skillSelect.value);
    $("summary").textContent = "Разобрано: " + selection.explored + " из " + selection.total +
      " · применено в жизни (самоотчёт): " + selection.practiced;
    $("progressBar").max = Math.max(1, selection.total);
    $("progressBar").value = selection.practiced;
    $("progressLabel").textContent = selection.total ?
      Math.round(100 * selection.practiced / selection.total) + "% практик отмечено" : "Нет упражнений";
    const age = data.ages.find(item => item.id === ageSelect.value);
    $("ageHelp").textContent = age ? age.helper : "";
    $("privacyMode").textContent = saveEnabled ?
      "Сохранение включено. Результаты доступны всем, кто откроет этот профиль браузера." :
      "Приватная временная сессия: после закрытия или обновления вкладки данные могут исчезнуть.";
  }
  function renderList() {
    const target = $("exerciseList");
    target.replaceChildren();
    visibleRows().forEach(item => {
      const response = choice(item.id);
      const button = make("button", "exercise-item" + (currentId === item.id ? " selected" : ""), item.title);
      button.type = "button";
      button.setAttribute("aria-current", currentId === item.id ? "true" : "false");
      const flag = make("span", "mini-status", response ? (response.practiced ? "Практика" : "Разобрано") : "Новое");
      button.append(flag);
      button.addEventListener("click", () => { currentId = item.id; render(); });
      target.append(button);
    });
    if (!target.childElementCount) target.textContent = "Для этого фильтра упражнений пока нет.";
  }
  function questionList(parent, title, values) {
    const section = make("section", "subsection");
    section.append(make("h3", "", title));
    const list = make("ul", "");
    values.forEach(value => list.append(make("li", "", value)));
    section.append(list); parent.append(section);
  }
  function ratingControl(labelText, chosen) {
    const wrapper = make("label", "field");
    wrapper.append(make("span", "", labelText));
    const select = make("select", "");
    const unknown = make("option", "", "Не оцениваю"); unknown.value = ""; select.append(unknown);
    for (let i = 1; i <= 5; i += 1) {
      const opt = make("option", "", i + (i === 1 ? " · пока трудно" : i === 5 ? " · уверенно" : ""));
      opt.value = String(i); select.append(opt);
    }
    select.value = chosen === null || chosen === undefined ? "" : String(chosen);
    wrapper.append(select);
    return { wrapper, select };
  }
  function renderScenario() {
    const panel = $("scenario");
    panel.replaceChildren();
    const item = data.scenarios.find(row => row.id === currentId && row.age === ageSelect.value && (!skillSelect.value || row.skill === skillSelect.value));
    if (!item) { panel.append(make("p", "", "Выберите ситуацию слева.")); return; }
    const response = choice(item.id);
    const skill = data.skills.find(s => s.id === item.skill);
    panel.append(make("div", "eyebrow", skill.label + " · " + ageSelect.value));
    panel.append(make("h2", "", item.title));
    panel.append(make("p", "situation", item.situation));
    panel.append(make("p", "goal", "Цель: " + item.goal));
    panel.append(make("h3", "", "Как бы ты поступил(а)?"));
    const options = make("div", "choices");
    item.options.forEach((option, index) => {
      const active = Boolean(response && response.option === index);
      const btn = make("button", "choice" + (active ? " active" : ""), option.text);
      btn.type = "button";
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.addEventListener("click", () => {
        state = core.answer(state, item.id, index, data); store(); render();
        notice("Вариант выбран. Прочитай объяснение и перейди к практике.");
      });
      options.append(btn);
    });
    panel.append(options);
    if (!response) {
      panel.append(make("p", "quiet", "Здесь нет баллов за «хорошего человека». Варианты помогают обсудить возможные последствия."));
      return;
    }
    const feedback = item.options[response.option];
    const explanation = make("div", "feedback " + feedback.type);
    explanation.append(make("strong", "", "Разбор варианта"));
    explanation.append(make("p", "", feedback.feedback));
    panel.append(explanation);
    questionList(panel, "Вопросы для размышления", item.questions);
    questionList(panel, "Наблюдаемые ориентиры освоения", item.criteria);
    const practice = make("section", "practice");
    practice.append(make("h3", "", "Попробуй в реальной жизни"));
    practice.append(make("p", "", item.practice));
    practice.append(make("p", "helper", "Для младших возрастов взрослый поддерживает, но не требует ответа и не оценивает личность."));
    const noteLabel = make("label", "field");
    noteLabel.append(make("span", "", "Короткая рефлексия (необязательно; не вводите имена и личные данные)"));
    const note = make("textarea", "reflection");
    note.maxLength = core.MAX_NOTE; note.rows = 3;
    note.placeholder = "Что получилось? Что попробую иначе?";
    note.value = response.note || "";
    noteLabel.append(note);
    practice.append(noteLabel);
    const scale = make("div", "scale");
    const before = ratingControl("До практики · субъективная уверенность", response.before);
    const after = ratingControl("После практики · субъективная уверенность", response.after);
    scale.append(before.wrapper, after.wrapper);
    practice.append(scale);
    const appliedLabel = make("label", "tick");
    const applied = make("input"); applied.type = "checkbox"; applied.checked = response.practiced;
    appliedLabel.append(applied, make("span", "", "Я действительно попробовал(а) действие вне тренажёра"));
    practice.append(appliedLabel);
    const saveButton = make("button", "primary", "Сохранить рефлексию");
    saveButton.type = "button";
    saveButton.addEventListener("click", () => {
      state = core.practice(state, item.id, {
        practiced: applied.checked,
        note: note.value,
        before: before.select.value ? Number(before.select.value) : null,
        after: after.select.value ? Number(after.select.value) : null
      }, data);
      store(); render(); notice("Рефлексия обновлена" + (applied.checked ? " · практика отмечена по самоотчёту." : "."));
    });
    practice.append(saveButton);
    panel.append(practice);
    if (item.adult) panel.append(make("p", "adult-tip", "Подсказка взрослому: " + item.adult));
    const next = make("button", "secondary", "Следующая ситуация");
    next.type = "button"; next.addEventListener("click", () => {
      const rows = visibleRows(); const pos = rows.findIndex(row => row.id === currentId);
      if (rows.length) { currentId = rows[(pos + 1) % rows.length].id; render(); $("scenario").focus(); }
    });
    panel.append(next);
  }
  function render() {
    const rows = visibleRows();
    if (rows.length && !rows.some(row => row.id === currentId)) currentId = rows[0].id;
    renderSummary(); renderList(); renderScenario();
  }
  ageSelect.addEventListener("change", render);
  skillSelect.addEventListener("change", render);
  $("recommend").addEventListener("click", () => {
    const picked = core.nextScenario(state, data, ageSelect.value, skillSelect.value);
    if (picked) { currentId = picked.id; render(); $("scenario").focus(); notice("Подобрана ситуация, которую ещё не разбирали или не применили."); }
  });
  saveSwitch.addEventListener("change", () => {
    saveEnabled = saveSwitch.checked;
    if (saveEnabled) { store(); notice("Сохранение включено только для этого профиля браузера."); }
    else { clearStored(); notice("Локальное сохранение отключено, ранее сохранённые данные удалены из хранилища."); }
    renderSummary();
  });
  $("export").addEventListener("click", () => {
    const content = core.safeJSON(state, data);
    const url = URL.createObjectURL(new Blob([content], {type: "application/json;charset=utf-8"}));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "adaptive-skill-trainer-v1.json";
    document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    notice("Экспортирован JSON с ответами и рефлексиями. Храните файл приватно.");
  });
  $("import").addEventListener("change", async event => {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw new Error("Файл слишком большой (максимум 1 МБ)");
      const loaded = core.normalizeState(JSON.parse(await file.text()), data);
      if (!confirm("Заменить текущую историю данными из файла?")) return;
      state = loaded; store(); render(); notice("История импортирована и проверена.");
    } catch (error) { notice("Импорт отклонён: " + error.message); }
    finally { event.target.value = ""; }
  });
  $("reset").addEventListener("click", () => {
    if (!confirm("Удалить все ответы и заметки тренажёра в этой сессии и браузере?")) return;
    state = core.freshState(); clearStored(); saveEnabled = false; saveSwitch.checked = false;
    render(); notice("Ответы и локальная история удалены.");
  });
  render();
})();
