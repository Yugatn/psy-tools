/* Telegram Mini App Wheel coaching — closed staging only.
 * Never trusts initDataUnsafe. No analytics, storage writes, redirects or LLM calls.
 * Only explicit user actions make requests to configured HTTPS staging origin.
 */
(function () {
  "use strict";
  const engine=window.WheelOfflineCoach;
  const cfg=window.WheelMiniAppConfig || {};
  const $=id=>document.getElementById(id);
  const PILOT=new Set(["main","work","finance","relationships","social",
    "development","rest","creativity","self_awareness"]);
  const wheels=engine.catalog.filter(w=>PILOT.has(w.id));
  const status=(text)=>{$("status").textContent=text;};
  let initData="", session=null, busy=false;

  function allowedApi() {
    if(typeof cfg.apiOrigin!=="string" || !cfg.apiOrigin.trim())return null;
    try{
      const raw=cfg.apiOrigin.trim(),url=new URL(raw);
      if(url.protocol!=="https:" || url.origin!==raw || url.username || url.password ||
          url.pathname!=="/" || url.search || url.hash) return null;
      return raw+"/api/v1/miniapp/coaching";
    }catch(_){return null;}
  }
  const api=allowedApi();
  function option(value,title){
    const el=document.createElement("option");el.value=String(value);el.textContent=title;return el;
  }
  function selectedWheel(){return wheels.find(w=>w.id===$("wheel").value)||null;}
  function selectedRay(){
    const wheel=selectedWheel(),i=Number($("ray").value);
    return wheel && Number.isInteger(i) && i>=0?wheel.rays[i]||null:null;
  }
  function preview(){
    const w=selectedWheel(),r=selectedRay(),raw=$("score").value;
    $("contextPreview").textContent=w&&r
      ? "Передать при запуске: колесо "+w.title+"; луч "+r.name+
        "; оценка "+(raw===""?"не передаётся":raw+"/10")+
        ". Другие оценки и журнал не передаются."
      : "Выберите колесо и луч. Без вашего решения никакие результаты не читаются.";
  }
  function setWheel(){
    const w=selectedWheel();
    $("ray").replaceChildren(option("","Выберите луч"));
    if(w)w.rays.forEach((name,i)=>$("ray").appendChild(option(i,name)));
    $("score").value="";
    preview();
  }
  wheels.forEach(w=>$("wheel").appendChild(option(w.id,w.title)));
  $("wheel").value="main";setWheel();
  for(let n=0;n<=10;n++)$("score").appendChild(option(n,n+" из 10"));

  function setBusy(state){
    busy=state;
    for(const id of ["connectBtn","startBtn","readScoreBtn","sendBtn","skipBtn","deleteBtn"]){
      $(id).disabled=state;
    }
  }
  function showMessage(role,message){
    const box=document.createElement("div");box.className="msg "+role;
    const title=document.createElement("strong");title.textContent=role==="coach"?"Офлайн-сценарий сервера":"Вы";
    const body=document.createElement("p");body.textContent=message;
    box.append(title,body);$("dialog").appendChild(box);
    box.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function sdkData(){
    const data=window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData;
    return typeof data==="string"&&data.length>0&&data.length<=16384?data:"";
  }
  async function connectTelegram(){
    if(busy)return;
    setBusy(true);
    try{
      if(!sdkData()){
        await new Promise((resolve,reject)=>{
          const el=document.createElement("script");
          el.src="https://telegram.org/js/telegram-web-app.js";
          el.onload=resolve;el.onerror=()=>reject(Error("Telegram SDK не загрузился"));
          document.head.appendChild(el);
        });
      }
      const data=sdkData();
      if(!data){
        status("Подписанные Telegram initData недоступны. Откройте страницу внутри реального Telegram Mini App.");
        return;
      }
      initData=data; // only in memory; never in URL, storage or logs
      try{window.Telegram.WebApp.ready();}catch(_){}
      $("connection").textContent="Контекст Telegram доступен. Подпись будет проверена сервером при запросе.";
      status("Проверка Telegram на стороне браузера не означает авторизацию. Выберите сферу и подтвердите передачу.");
    }catch(_){status("Не удалось получить контекст Telegram. Используйте офлайн-коуча.");}
    finally{setBusy(false);}
  }
  function readLocalScore(){
    const w=selectedWheel(),r=selectedRay();
    if(!w||!r){status("Сначала выберите колесо и луч.");return;}
    let saved;
    try{saved=engine.readList(localStorage).find(x=>x.id===w.id);}catch(_){
      status("Браузер запретил чтение локальных оценок.");return;
    }
    const candidate=saved && saved.rays[r.index];
    $("score").value=candidate && candidate.score!==null?String(candidate.score):"";
    preview();
    status(candidate && candidate.score!==null
      ?"Локальная оценка подставлена для этого луча. Она будет передана только после отдельного подтверждения."
      :"Для этого луча нет сохранённой оценки. Можно выбрать балл вручную или ничего не передавать.");
  }
  async function request(method,route,body){
    if(!api || !initData)throw Error("Нет настроенного staging API или Telegram initData");
    const options={
      method,
      headers:{"Authorization":"tma "+initData,"Content-Type":"application/json"},
      mode:"cors",redirect:"error",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",
    };
    if(body!==undefined)options.body=JSON.stringify(body);
    const response=await fetch(api+route,options);
    if(!response.ok){
      const error=new Error("Сервер отклонил запрос: HTTP "+response.status);
      error.code=response.status;throw error;
    }
    return response.status===204?null:await response.json();
  }
  function showQuestion(step,question,total){
    $("step").textContent="Вопрос "+(step+1)+" из "+total;
    showMessage("coach",question);
    $("answer").value="";
    $("answer").focus();
  }
  async function start(){
    if(busy||session)return;
    const w=selectedWheel(),r=selectedRay();
    if(!w||!r){status("Выберите колесо и луч.");return;}
    if(!$("adult").checked||!$("consent").checked){
      status("Для серверной сессии требуется подтверждение совершеннолетия и отдельное согласие на обработку.");return;
    }
    if(!api){status("Серверный адрес не настроен. Это только интерфейс закрытого стенда; используйте офлайн-коуча.");return;}
    if(!initData){status("Сначала подключите Telegram внутри Mini App.");return;}
    const raw=$("score").value;
    const score=raw===""?null:Number(raw);
    if(score!==null&&(!Number.isInteger(score)||score<0||score>10)){
      status("Неверная оценка.");return;
    }
    setBusy(true);
    try{
      const result=await request("POST","/sessions",{
        wheel_id:w.id,ray_id:"r"+r.index,score,mode:$("mode").value,
        consent_for_server_processing:true,adult_attested:true,
      });
      if(!result||!result.session_id||!Number.isInteger(result.step)){
        throw Error("Неполный ответ сервера");
      }
      session={id:result.session_id,step:result.step,total:result.total_steps};
      $("dialog").replaceChildren();
      $("chatPanel").hidden=false;
      $("finishPanel").hidden=true;
      $("startBtn").disabled=true;
      showQuestion(result.step,result.question,result.total_steps);
      status("Сессия открыта. Сервер не хранит текст ответов в постоянной базе; безопасность транспорта требует отдельной проверки.");
    }catch(err){status(err.message);}
    finally{setBusy(false);}
  }
  async function turn(action){
    if(!session||busy)return;
    const text=$("answer").value.trim();
    if(action==="answer" && (!text||text.length>2000)){
      status("Ответ должен содержать от 1 до 2000 символов.");return;
    }
    setBusy(true);
    const sid=session.id,step=session.step;
    try{
      const body={expected_step:step,action};
      if(action==="answer")body.text=text;
      const result=await request("POST","/sessions/"+encodeURIComponent(sid)+"/turns",body);
      showMessage("user",action==="skip"?"Пропустить":text);
      $("answer").value="";
      if(result.finished){
        session=null;$("chatPanel").hidden=true;$("finishPanel").hidden=false;
        $("finishText").textContent=result.handoff ||
          "Сессия завершена. Итоги не сохранялись на сервере. Вы вправе очистить локальные сообщения.";
        if(result.handoff)status("Обычный коучинг остановлен. При необходимости обратитесь за человеческой помощью.");
        else status("Сессия завершена и удалена из временного серверного хранилища.");
      }else{
        session.step=result.step;
        showQuestion(result.step,result.question,session.total);
        status("Ход принят. Текст ответа не сохранён в серверном состоянии.");
      }
    }catch(err){
      if(err.code===409){
        status("Повторный или устаревший ход. Проверьте состояние сессии, текст автоматически не отправляется повторно.");
        try{
          const state=await request("GET","/sessions/"+encodeURIComponent(sid));
          session.step=state.step;session.total=state.total_steps;
          $("dialog").replaceChildren();
          showQuestion(state.step,state.question,state.total_steps);
        }catch(_){status("Сессия недоступна. Используйте удаление/завершение и офлайн-режим.");}
      }else status(err.message+"; ответ автоматически не отправляется повторно.");
    }finally{setBusy(false);}
  }
  async function remove(){
    if(!session||busy)return;
    if(!confirm("Удалить текущую серверную сессию? Несохранённые ответы на экране можно очистить отдельно."))return;
    setBusy(true);
    try{
      await request("DELETE","/sessions/"+encodeURIComponent(session.id));
      session=null;$("chatPanel").hidden=true;$("finishPanel").hidden=false;
      $("finishText").textContent="Сервер подтвердил удаление текущей сессии. Сообщения на этом экране можно очистить.";
      status("Серверная сессия удалена.");
    }catch(err){status("Удаление на сервере НЕ подтверждено: "+err.message+". Сессия истечёт не позднее 20 минут.");}
    finally{setBusy(false);}
  }
  function clearScreen(){
    $("dialog").replaceChildren();$("answer").value="";
    $("finishText").textContent="";$("finishPanel").hidden=true;
    $("startBtn").disabled=false;
    status("Локальные сообщения очищены. Оценки колёс не изменены.");
  }
  $("wheel").addEventListener("change",setWheel);
  $("ray").addEventListener("change",()=>{$("score").value="";preview();});
  $("score").addEventListener("change",preview);
  $("connectBtn").addEventListener("click",connectTelegram);
  $("readScoreBtn").addEventListener("click",readLocalScore);
  $("startBtn").addEventListener("click",start);
  $("sendBtn").addEventListener("click",()=>turn("answer"));
  $("skipBtn").addEventListener("click",()=>turn("skip"));
  $("deleteBtn").addEventListener("click",remove);
  $("clearBtn").addEventListener("click",clearScreen);
  $("answer").addEventListener("keydown",e=>{
    if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();turn("answer");}
  });
  window.addEventListener("pagehide",()=>{
    initData="";session=null;$("dialog").replaceChildren();$("answer").value="";
  });
  if(!api)status("Стенд отключён: HTTPS API не настроен. Никакие данные на сервер не передаются.");
})();
