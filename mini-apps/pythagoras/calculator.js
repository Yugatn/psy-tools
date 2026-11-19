/* PSY-TOOLS · Психоматрица Пифагора · deterministic calculation engine v1
 * Symbolic numerology only. Results are not evidence about personality or health.
 * Classical four working numbers; selectable leading-zero convention for days 01..09.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PythagorasCalculator = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null), function () {
  "use strict";
  const VERSION = "1.0.0";
  const LAYOUT = Object.freeze([[1,4,7],[2,5,8],[3,6,9]]);
  const NAMES = Object.freeze({
    1:"Характер", 2:"Энергия", 3:"Интерес", 4:"Здоровье (символ)",
    5:"Логика", 6:"Труд", 7:"Удача (символ)", 8:"Ответственность", 9:"Память"
  });
  const LINES = Object.freeze([
    {id:"goal",name:"Целеустремлённость",digits:[1,4,7]},
    {id:"family",name:"Семейность",digits:[2,5,8]},
    {id:"habits",name:"Стабильность",digits:[3,6,9]},
    {id:"esteem",name:"Самооценка",digits:[1,2,3]},
    {id:"money",name:"Быт и материальное",digits:[4,5,6]},
    {id:"talent",name:"Талант (символ)",digits:[7,8,9]},
    {id:"spirit",name:"Духовность (символ)",digits:[1,5,9]},
    {id:"temperament",name:"Темперамент (символ)",digits:[3,5,7]}
  ]);
  function digitSum(number) {
    if (!Number.isSafeInteger(number)) throw new TypeError("Ожидалось целое число");
    return String(Math.abs(number)).split("").reduce((sum, c) => sum + Number(c), 0);
  }
  function daysInMonth(month, year) {
    const leap=year%4===0 && (year%100!==0 || year%400===0);
    return [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
  }
  function parseDate(raw) {
    if (typeof raw!=="string") throw new TypeError("Введите дату рождения.");
    const str=raw.trim();
    let m,day,month,year;
    if ((m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(str))) {
      day=Number(m[1]);month=Number(m[2]);year=Number(m[3]);
    } else if ((m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(str))) {
      day=Number(m[3]);month=Number(m[2]);year=Number(m[1]);
    } else {
      throw new Error("Введите полную дату в формате ДД.ММ.ГГГГ.");
    }
    if (year<1 || year>9999 || month<1 || month>12 || day<1 || day>daysInMonth(month,year))
      throw new Error("Несуществующая календарная дата.");
    const dd=String(day).padStart(2,"0"), mm=String(month).padStart(2,"0"), yyyy=String(year).padStart(4,"0");
    return {day,month,year,dd,mm,yyyy,display:dd+"."+mm+"."+yyyy,iso:yyyy+"-"+mm+"-"+dd};
  }
  function calculate(raw, options) {
    const date=parseDate(raw);
    const rule=options && options.firstDayRule!==undefined ? options.firstDayRule : "significant";
    if (rule!=="significant" && rule!=="literal") throw new Error("Неизвестный вариант трактовки первого разряда дня.");
    const dateDigits=date.dd+date.mm+date.yyyy;
    const first=Array.from(dateDigits,Number).reduce((a,b)=>a+b,0);
    const second=digitSum(first);
    const firstDayDigit=rule==="literal" ? Number(date.dd[0]) : Number(String(date.day)[0]);
    const third=first-2*firstDayDigit;
    const fourth=digitSum(third);
    const working=[first,second,third,fourth];
    const all=dateDigits+working.join("");
    const counts=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,0]));
    for(const c of all) if(c>="1" && c<="9") counts[Number(c)]++;
    const lines=LINES.map(l=>({...l,count:l.digits.reduce((s,n)=>s+counts[n],0)}));
    return {version:VERSION,date,rule,firstDayDigit,working,counts,layout:LAYOUT.map(row=>row.map(n=>({
      digit:n,count:counts[n],name:NAMES[n],symbols:String(n).repeat(counts[n])
    }))),lines,sourceDigits:dateDigits,workingDigits:working.join(" "),nonZeroTotal:Object.values(counts).reduce((s,n)=>s+n,0)};
  }
  function formatText(result) {
    if(!result||!result.date||!result.counts)throw new TypeError("Нет результата");
    const r=result;
    const rows=LAYOUT.map(row=>row.map(n=>String(n).repeat(r.counts[n]) || "—").join(" | "));
    return [
      "Квадрат Пифагора · "+r.date.display,
      "Рабочие числа: "+r.working.join(" · "),
      ...rows,
      "Линии: "+r.lines.map(l=>l.name+" "+l.count).join("; "),
      "Нумерологическая символическая система, не психологическая диагностика."
    ].join("\n");
  }
  return Object.freeze({VERSION,LAYOUT,NAMES,LINES,digitSum,daysInMonth,parseDate,calculate,formatText});
});
