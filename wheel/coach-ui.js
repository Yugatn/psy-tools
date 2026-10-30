/* Wheel Coach UI — no external model, no API calls, no chat transcript persistence. */
(function () {
  "use strict";
  const engine=window.WheelOfflineCoach;
  const $=id=>document.getElementById(id);
  let wheels=[],session=null;
  const talk=$("conversation"),wheelSelect=$("wheelSelect"),raySelect=$("raySelect");
  const setStatus=(text)=>{$("status").textContent=text;};
  function toggle(id,on){$(id).hidden=!on;}
  function makeOption(value,label) {
    const el=document.createElement("option");
    el.value=String(value);el.textContent=label;return el;
  }
  function currentWheel() {
    const i=Number(wheelSelect.value);
    return Number.isInteger(i)&&i>=0?wheels[i]||null:null;
  }
  function ray() {
    const wheel=currentWheel(),i=Number(raySelect.value);
    return wheel && Number.isInteger(i)&&i>=0?wheel.rays[i]||null:null;
  }
  function updateRays() {
    const w=currentWheel();
    raySelect.replaceChildren(makeOption("","Выберите луч"));
    if(w) w.rays.forEach((r,i)=>{
      raySelect.appendChild(makeOption(i,r.name+" — "+(r.score===null?"нет оценки":r.score+" из 10")));
    });
    $("startBtn").disabled=!w;
  }
  function loadWheels() {
    if(session && !confirm("Текущий диалог будет закрыт без сохранения. Продолжить?")) return;
    session=null;
    talk.replaceChildren();
    toggle("dialogue",false);
    toggle("completePanel",false);
    toggle("choosePanel",true);
    toggle("helpPanel",false);
    try { wheels=engine.readList(localStorage); }
    catch (_) { wheels=[];setStatus("Не удалось прочитать локальные результаты."); }
    wheelSelect.replaceChildren(makeOption("","Выберите колесо"));
    wheels.forEach((w,i)=>{
      wheelSelect.appendChild(makeOption(i,w.title+" · "+w.rays.filter(r=>r.score!==null).length+" оценок"));
    });
    const wanted=decodeURIComponent(location.hash.replace(/^#/,""));
    const match=wheels.findIndex(w=>w.id===wanted || (wanted==="detail"&&w.id.startsWith("wheelBalanceDetail:")));
    if(match>=0)wheelSelect.value=String(match);
    updateRays();
    setStatus(wheels.length
      ?"Колёса обнаружены только в текущем профиле браузера. Выберите луч и режим."
      :"Сохранённых оценок не найдено. Сначала заполните колесо в этом браузере. Профили других людей недоступны.");
    toggle("noData",wheels.length===0);
  }
  function addMessage(author,message) {
    const box=document.createElement("div");
    box.className=author==="user"?"message user":"message coach";
    const label=document.createElement("strong");
    label.textContent=author==="user"?"Вы":"Офлайн-помощник";
    const text=document.createElement("p");
    text.textContent=message;
    box.append(label,text);
    talk.appendChild(box);
    box.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function showPrompt() {
    const next=engine.prompt(session);
    if(!next){finish();return;}
    $("stepInfo").textContent="Вопрос "+(session.stage+1)+" из "+(session.mode==="coaching"?6:5);
    addMessage("coach",next);
    $("answer").value="";
    $("answer").focus();
  }
  function start() {
    const w=currentWheel(),r=ray();
    if(!w||!r){setStatus("Выберите колесо и конкретный луч.");return;}
    if(!$("consent").checked){setStatus("Для начала необходимо подтвердить добровольное участие.");return;}
    session=engine.begin(w,r.index,$("mode").value);
    talk.replaceChildren();
    toggle("choosePanel",false);
    toggle("dialogue",true);
    toggle("completePanel",false);
    toggle("helpPanel",false);
    $("contextInfo").textContent=w.title+" · "+r.name+" · "+(r.score===null?"не оценено":r.score+"/10");
    setStatus("Сессия работает только в памяти вкладки. Ответы не отправляются на сервер.");
    showPrompt();
  }
  function reply(skip=false) {
    if(!session)return;
    try{
      const answer=$("answer").value;
      session=skip?engine.skip(session):engine.answer(session,answer);
      addMessage("user",skip?"Пропустить":answer.trim());
      showPrompt();
    }catch(err){setStatus(err.message);}
  }
  function finish() {
    toggle("dialogue",false);toggle("completePanel",true);
    $("summary").value=engine.summary(session);
    setStatus("Готово. Этот текст пока существует только в памяти вкладки. Можно скопировать или явно сохранить его в выбранном колесе.");
  }
  function cancel() {
    if(session && !confirm("Завершить без сохранения и очистить ответы из этой вкладки?"))return;
    session=null;talk.replaceChildren();$("answer").value="";$("summary").value="";
    toggle("dialogue",false);toggle("completePanel",false);toggle("choosePanel",true);
    $("consent").checked=false;
    setStatus("Диалог очищен. Существующие оценки колеса не затронуты.");
  }
  function saveToWheel() {
    if(!session||!engine.complete(session))return;
    const text=$("summary").value.trim();
    if(!text||text.length>3500){setStatus("Для сохранения сократите итоговый текст до 3500 символов.");return;}
    const key=engine.improvementsKey(session.key);
    if(!key){setStatus("Для этого колеса сохранение пока недоступно; скопируйте итог.");return;}
    const consent="Записать текст в локальную заметку выбранного луча? Его сможет увидеть другой человек в том же профиле браузера. История диалога отдельно не сохраняется.";
    if(!confirm(consent))return;
    try{
      const raw=localStorage.getItem(key);
      const value=raw?JSON.parse(raw):{};
      if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Неподдерживаемый формат существующих заметок");
      const i=String(session.ray.index),old=value[i]&&typeof value[i]==="object"&&!Array.isArray(value[i])?value[i]:{};
      const original=typeof old.note==="string"?old.note:"";
      const nextNote=original?original+"\n\n"+text:text;
      if(nextNote.length>12000){setStatus("Существующая заметка слишком велика. Скопируйте итог отдельно.");return;}
      value[i]={...old,note:nextNote};
      const serialized=JSON.stringify(value);
      localStorage.setItem(key,serialized);
      if(localStorage.getItem(key)!==serialized)throw Error("Запись не подтверждена");
      setStatus("Итог сохранён в заметке выбранного луча. Другие цели и оценки не изменены.");
    }catch(e){setStatus("Не удалось сохранить заметку: "+e.message);}
  }
  async function copySummary() {
    const text=$("summary").value;
    if(!text){setStatus("Нет текста для копирования.");return;}
    try { await navigator.clipboard.writeText(text);setStatus("Итог скопирован."); }
    catch (_) { $("summary").select();setStatus("Выделен текст: скопируйте его вручную."); }
  }
  function help() {
    session=null;talk.replaceChildren();$("answer").value="";$("summary").value="";
    toggle("dialogue",false);toggle("completePanel",false);toggle("choosePanel",false);toggle("helpPanel",true);
    setStatus("Обычная коучинговая беседа остановлена.");
  }
  wheelSelect.addEventListener("change",updateRays);
  $("loadBtn").addEventListener("click",loadWheels);
  $("startBtn").addEventListener("click",start);
  $("sendBtn").addEventListener("click",()=>reply(false));
  $("skipBtn").addEventListener("click",()=>reply(true));
  $("cancelBtn").addEventListener("click",cancel);
  $("doneBtn").addEventListener("click",cancel);
  $("copyBtn").addEventListener("click",copySummary);
  $("saveBtn").addEventListener("click",saveToWheel);
  $("helpBtn").addEventListener("click",help);
  $("backFromHelp").addEventListener("click",()=>{toggle("helpPanel",false);toggle("choosePanel",true);setStatus("Выберите сферу для новой добровольной сессии.");});
  $("answer").addEventListener("keydown",event=>{
    if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)){event.preventDefault();reply(false);}
  });
  window.addEventListener("pagehide",()=>{session=null;talk.replaceChildren();$("answer").value="";$("summary").value="";toggle("dialogue",false);toggle("completePanel",false);});
  toggle("choosePanel",true);
  toggle("dialogue",false);toggle("completePanel",false);toggle("helpPanel",false);
  toggle("noData",false);
  setStatus("Чтобы увидеть результаты из этого браузера, нажмите «Показать мои оценки».");
})();
