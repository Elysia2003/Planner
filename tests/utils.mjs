// src/utils.ts
function pad(n) {
  return n < 10 ? "0" + n : String(n);
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() {
  return toDateStr(/* @__PURE__ */ new Date());
}
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function daysBetween(a, b) {
  const da = parseDate(a).getTime();
  const db = parseDate(b).getTime();
  return Math.round((db - da) / 864e5);
}
function weekStart(date, weekStartDay = 1) {
  const d = new Date(date);
  const day = d.getDay();
  let diff = (day - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function relativeDate(s) {
  const diff = daysBetween(todayStr(), s);
  if (diff === 0) return "\u4ECA\u5929";
  if (diff === 1) return "\u660E\u5929";
  if (diff === 2) return "\u540E\u5929";
  if (diff === -1) return "\u6628\u5929";
  if (diff > 2 && diff <= 7) return `${diff} \u5929\u540E`;
  if (diff < -1 && diff >= -7) return `${-diff} \u5929\u524D`;
  const d = parseDate(s);
  const now = /* @__PURE__ */ new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`;
  }
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`;
}
function weekday(s) {
  const names = ["\u5468\u65E5", "\u5468\u4E00", "\u5468\u4E8C", "\u5468\u4E09", "\u5468\u56DB", "\u5468\u4E94", "\u5468\u516D"];
  return names[parseDate(s).getDay()];
}
function monthStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function currentMonthStr() {
  return monthStr(/* @__PURE__ */ new Date());
}
function fenToYuan(fen) {
  return (fen / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function yuanToFen(yuan) {
  return Math.round(yuan * 100);
}
function formatMinutes(min) {
  if (min < 60) return `${min} \u5206\u949F`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} \u5C0F\u65F6 ${m} \u5206` : `${h} \u5C0F\u65F6`;
}
function repeatRuleText(r) {
  const f = { daily: "\u6BCF\u5929", weekly: "\u6BCF\u5468", monthly: "\u6BCF\u6708", yearly: "\u6BCF\u5E74" }[r.freq];
  if (r.interval > 1) {
    const u = { daily: "\u5929", weekly: "\u5468", monthly: "\u4E2A\u6708", yearly: "\u5E74" }[r.freq];
    return `\u6BCF ${r.interval} ${u}`;
  }
  if (r.freq === "weekly" && r.byDay?.length) {
    const names = ["\u5468\u65E5", "\u5468\u4E00", "\u5468\u4E8C", "\u5468\u4E09", "\u5468\u56DB", "\u5468\u4E94", "\u5468\u516D"];
    return "\u6BCF\u5468 " + r.byDay.map((d) => names[d]).join("\u3001");
  }
  if (r.freq === "monthly" && r.byMonthDay?.length) {
    return "\u6BCF\u6708 " + r.byMonthDay.join("\u3001") + " \u53F7";
  }
  return f;
}
function matchesRepeat(r, date, startDate) {
  if (date < startDate) return false;
  const start = parseDate(startDate);
  const target = parseDate(date);
  const diffDays = Math.round((target.getTime() - start.getTime()) / 864e5);
  if (diffDays < 0) return false;
  switch (r.freq) {
    case "daily":
      return diffDays % r.interval === 0;
    case "weekly": {
      if (r.byDay?.length && !r.byDay.includes(target.getDay())) return false;
      const startWeek = Math.floor(weekStart(start, 1).getTime() / (7 * 864e5));
      const targetWeek = Math.floor(weekStart(target, 1).getTime() / (7 * 864e5));
      const weekDiff = targetWeek - startWeek;
      return weekDiff >= 0 && weekDiff % r.interval === 0;
    }
    case "monthly": {
      const monthDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
      if (monthDiff % r.interval !== 0) return false;
      if (r.byMonthDay?.length) return r.byMonthDay.includes(target.getDate());
      return target.getDate() === start.getDate();
    }
    case "yearly": {
      const yearDiff = target.getFullYear() - start.getFullYear();
      if (yearDiff % r.interval !== 0) return false;
      return target.getMonth() === start.getMonth() && target.getDate() === start.getDate();
    }
    default:
      return false;
  }
}
function calcStreak(dates) {
  if (dates.length === 0) return { current: 0, best: 0 };
  const set = new Set(dates);
  const sorted = Array.from(set).sort();
  let best = 0, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1], sorted[i]) === 1) run++;
    else {
      best = Math.max(best, run);
      run = 1;
    }
  }
  best = Math.max(best, run);
  let current = 0;
  let cursor = todayStr();
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}
var PALETTE = ["#3d5afe", "#0f9d58", "#b8860b", "#d85a30", "#7f77dd", "#1d9e75", "#e24b4a", "#185fa5", "#b04a4a", "#0b7285"];
function colorFor(n) {
  return PALETTE[n % PALETTE.length];
}
function downloadFile(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
function downloadJson(name, obj) {
  downloadFile(name, JSON.stringify(obj, null, 2), "application/json;charset=utf-8");
}
function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
export {
  addDays,
  calcStreak,
  colorFor,
  currentMonthStr,
  daysBetween,
  debounce,
  downloadFile,
  downloadJson,
  fenToYuan,
  formatMinutes,
  matchesRepeat,
  monthStr,
  nowISO,
  pad,
  parseDate,
  relativeDate,
  repeatRuleText,
  toDateStr,
  todayStr,
  weekStart,
  weekday,
  yuanToFen
};
