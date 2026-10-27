"use strict";

// .workbuddy-ai/tmp/verify-sort.ts
var import_fs = require("fs");

// src/history/mode1/shape.ts
var ICONS = {
  metrics: "table",
  table: "table",
  nested: "nested",
  duplicate: "duplicate"
};
var METRIC_GROUP_NAME = "\u6307\u6807";
var METRIC_ORDER = [
  "AI\u5904\u7F6E\u91CF",
  "AI\u5904\u7F6E\u7387",
  "AI\u5173\u95ED",
  "AI\u5173\u5355\u7387",
  "\u4EBA\u5DE5\u5173\u95ED",
  "\u4EBA\u5DE5\u5173\u5355\u7387",
  "\u81EA\u52A8\u5316\u5173\u95ED",
  "\u81EA\u52A8\u5316\u5173\u5355\u7387",
  "AI\u672A\u7EB3\u7BA1",
  "\u544A\u8B66\u603B\u91CF"
];
var METRIC_INDEX = METRIC_ORDER.reduce((map, name, index) => {
  map[name] = index;
  return map;
}, {});
function orderMetrics(metrics) {
  const fallback = METRIC_ORDER.length;
  return (metrics || []).map((metric, index) => ({ metric, index })).sort((a, b) => {
    const ia = METRIC_INDEX[a.metric.key];
    const ib = METRIC_INDEX[b.metric.key];
    const ra = ia === void 0 ? fallback : ia;
    const rb = ib === void 0 ? fallback : ib;
    return ra === rb ? a.index - b.index : ra - rb;
  }).map((item) => item.metric);
}
var SCALAR_TYPES = ["string", "number", "boolean"];
function isPlain(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isScalar(value) {
  return value === null || value === void 0 || SCALAR_TYPES.indexOf(typeof value) > -1;
}
function isDuplicateGroups(value) {
  return Array.isArray(value) && value.length > 0 && value.every((g) => isPlain(g) && Array.isArray(g.data) && "\u91CD\u590D\u6027\u8BF4\u660E" in g);
}
function isNestedGroups(value) {
  if (!isPlain(value)) return false;
  const vals = Object.values(value);
  return vals.length > 0 && vals.every((x) => isPlain(x) && Object.values(x).every(Array.isArray));
}
function shapeOf(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return "empty";
    if (isDuplicateGroups(value)) return "duplicate";
    if (value.every(isPlain)) return "rows";
    return "raw";
  }
  if (!isPlain(value)) return "raw";
  const vals = Object.values(value);
  if (vals.length === 0) return "empty";
  if (vals.every(isScalar)) return "metrics";
  if (vals.every(Array.isArray)) return "table";
  if (isNestedGroups(value)) return "nested";
  return "mixed";
}
function metricTone(raw) {
  const empty = raw === void 0 || raw === null || raw === "";
  if (empty) return "muted";
  const num = Number(String(raw).replace("%", ""));
  return !isNaN(num) && num === 0 ? "muted" : "active";
}
function toMetrics(obj) {
  return Object.keys(obj || {}).map((key) => {
    const raw = obj[key];
    const empty = raw === void 0 || raw === null || raw === "";
    return {
      key,
      value: raw,
      display: empty ? "-" : raw,
      tone: metricTone(raw)
    };
  });
}
function makeTableSection(key, lists) {
  const items = lists.map((l) => ({ name: l.name, rows: l.rows })).sort((a, b) => b.rows.length - a.rows.length);
  if (items.length === 0) return null;
  const total2 = items.reduce((sum, item) => sum + item.rows.length, 0);
  const single = items.length === 1;
  return {
    key,
    kind: "table",
    title: single && items[0].name !== key ? `${key} \xB7 ${items[0].name}` : key,
    icon: ICONS.table,
    badge: single ? `${total2} \u6761` : `${items.length} \u7C7B / ${total2} \u6761`,
    lists: items
  };
}
function makeNestedSection(key, value) {
  const levels = Object.keys(value).map((name) => ({
    name,
    groups: Object.keys(value[name] || {}).map((groupName) => ({
      name: groupName,
      rows: Array.isArray(value[name][groupName]) ? value[name][groupName].filter(isPlain) : []
    })).sort((a, b) => b.rows.length - a.rows.length)
  }));
  levels.sort((a, b) => levelRowCount(b) - levelRowCount(a));
  if (levels.length === 0) return null;
  const total2 = levels.reduce(
    (sum, level) => sum + level.groups.reduce((s, group) => s + group.rows.length, 0),
    0
  );
  return {
    key,
    kind: "nested",
    title: key,
    icon: ICONS.nested,
    badge: `${levels.length} \u7C7B / ${total2} \u6761`,
    levels
  };
}
function makeDuplicateSection(key, groups) {
  const valid = groups.filter((g) => isPlain(g) && Array.isArray(g.data) && g.data.length > 0);
  const rows = valid.reduce((sum, g) => sum + g.data.length, 0);
  return {
    key,
    kind: "duplicate",
    title: key,
    icon: ICONS.duplicate,
    badge: `${valid.length} \u7EC4 / ${rows} \u6761`,
    groups: valid
  };
}
function buildSections(payload2) {
  const sections = [];
  const metrics = {};
  if (!isPlain(payload2)) return { metricGroups: [], sections };
  const pushList = (key, lists) => {
    const section = makeTableSection(key, lists);
    if (section) sections.push(section);
  };
  const pushNested = (key, value) => {
    const section = makeNestedSection(key, value);
    if (section) sections.push(section);
  };
  Object.keys(payload2).forEach((key) => {
    const value = payload2[key];
    const shape = shapeOf(value);
    if (shape === "empty" || shape === "raw") return;
    if (shape === "metrics") {
      Object.keys(value).forEach((name) => {
        metrics[name] = value[name];
      });
      return;
    }
    if (shape === "table") {
      const table = value;
      pushList(
        key,
        Object.keys(table).map((name) => ({ name, rows: table[name].filter(isPlain) }))
      );
      return;
    }
    if (shape === "rows") {
      pushList(key, [{ name: key, rows: value.filter(isPlain) }]);
      return;
    }
    if (shape === "nested") {
      pushNested(key, value);
      return;
    }
    if (shape === "duplicate") {
      sections.push(makeDuplicateSection(key, value));
      return;
    }
    const lists = [];
    const nested = {};
    Object.keys(value).forEach((subKey) => {
      const sub = value[subKey];
      if (isScalar(sub)) {
        metrics[subKey] = sub;
      } else if (Array.isArray(sub)) {
        lists.push({ name: subKey, rows: sub.filter(isPlain) });
      } else if (isNestedGroups(sub)) {
        nested[subKey] = sub;
      }
    });
    if (lists.length > 0) pushList(key, lists);
    if (Object.keys(nested).length > 0) {
      pushNested(key, nested);
    }
  });
  const merged = orderMetrics(toMetrics(metrics));
  const metricGroups = merged.length > 0 ? [{ name: METRIC_GROUP_NAME, metrics: merged }] : [];
  return { metricGroups, sections };
}
function levelRowCount(level) {
  return (level && level.groups || []).reduce((sum, group) => sum + group.rows.length, 0);
}

// .workbuddy-ai/tmp/verify-sort.ts
var payload = JSON.parse((0, import_fs.readFileSync)("src/history/mode1/mock-data.json", "utf8"));
var built = buildSections(payload);
console.log("=== \u533A\u5757\u987A\u5E8F\uFF08\u4FDD\u6301 payload key \u987A\u5E8F\uFF0C\u672A\u52A8\uFF09 ===");
console.log(built.sections.map((s) => `${s.kind}:${s.key}`).join(" | "));
console.log("");
var ok = true;
var checkDesc = (label, counts) => {
  const sorted = counts.every((n, i) => i === 0 || counts[i - 1] >= n);
  if (!sorted) ok = false;
  console.log(`${sorted ? "PASS" : "FAIL"}  ${label} => [${counts.join(", ")}]`);
};
console.log("=== 1/2. AI\u5904\u7F6E\uFF08nested\uFF09 ===");
for (const section of built.sections) {
  if (section.kind !== "nested") continue;
  const levelCounts = section.levels.map(
    (lv) => lv.groups.reduce((sum, g) => sum + g.rows.length, 0)
  );
  checkDesc(`${section.key} \u5DE6\u4FA7\u5BFC\u822A\uFF08\u4E00\u7EA7\uFF09`, levelCounts);
  console.log("      \u4E00\u7EA7\u987A\u5E8F:", section.levels.map((lv, i) => `${lv.name}=${levelCounts[i]}`).join(" > "));
  for (const level of section.levels) {
    checkDesc(`  \u300C${level.name}\u300D\u544A\u8B66\u6E90 chip`, level.groups.map((g) => g.rows.length));
    console.log("      \u4E8C\u7EA7\u987A\u5E8F:", level.groups.map((g) => `${g.name}=${g.rows.length}`).join(" > "));
  }
}
console.log("");
console.log("=== 3. \u8868\u683C\u578B\u533A\u5757\u7684 tab ===");
for (const section of built.sections) {
  if (section.kind !== "table") continue;
  checkDesc(`${section.key} tab`, section.lists.map((l) => l.rows.length));
  console.log("      tab \u987A\u5E8F:", section.lists.map((l) => `${l.name}=${l.rows.length}`).join(" > "));
}
console.log("");
console.log("=== \u603B\u91CF\u6838\u5BF9\uFF08\u6392\u5E8F\u4E0D\u5E94\u6539\u53D8\u6761\u6570\uFF09 ===");
var total = built.sections.reduce((sum, s) => {
  if (s.kind === "table") return sum + s.lists.reduce((n, l) => n + l.rows.length, 0);
  if (s.kind === "nested")
    return sum + s.levels.reduce((n, lv) => n + lv.groups.reduce((m, g) => m + g.rows.length, 0), 0);
  if (s.kind === "duplicate") return sum + s.groups.reduce((n, g) => n + g.data.length, 0);
  return sum;
}, 0);
console.log("\u660E\u7EC6\u603B\u6761\u6570 =", total);
console.log("");
console.log("=== 4. \u5408\u6210\u8F7D\u8377\uFF1A\u6761\u6570\u4E0D\u540C\u65F6\u786E\u5B9E\u4F1A\u91CD\u6392 ===");
var synth = buildSections({
  \u81EA\u52A8\u5316\u5173\u5355: {
    \u7532: [{ a: 1 }],
    \u4E59: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }],
    \u4E19: [{ a: 1 }, { a: 2 }]
  },
  AI\u5904\u7F6E: {
    \u5C11: { "9": [{ a: 1 }] },
    \u591A: { "1": [{ a: 1 }, { a: 2 }, { a: 3 }], "7": [{ a: 1 }, { a: 2 }] }
  }
});
for (const section of synth.sections) {
  if (section.kind === "table") {
    const counts = section.lists.map((l) => l.rows.length);
    const sorted = counts.every((n, i) => i === 0 || counts[i - 1] >= n);
    if (!sorted) ok = false;
    console.log(`${sorted ? "PASS" : "FAIL"}  ${section.key} tab => [${counts.join(", ")}]`);
  }
  if (section.kind === "nested") {
    const levelCounts = section.levels.map(
      (lv) => lv.groups.reduce((sum, g) => sum + g.rows.length, 0)
    );
    const sorted = levelCounts.every((n, i) => i === 0 || levelCounts[i - 1] >= n);
    if (!sorted) ok = false;
    console.log(
      `${sorted ? "PASS" : "FAIL"}  ${section.key} \u5DE6\u4FA7\u5BFC\u822A => [${levelCounts.join(", ")}] (${section.levels.map((lv) => lv.name).join(" > ")})`
    );
    for (const level of section.levels) {
      const counts = level.groups.map((g) => g.rows.length);
      const s = counts.every((n, i) => i === 0 || counts[i - 1] >= n);
      if (!s) ok = false;
      console.log(`${s ? "PASS" : "FAIL"}    \u300C${level.name}\u300Dchip => [${counts.join(", ")}]`);
    }
  }
}
console.log("");
console.log(ok ? "ALL PASS" : "HAS FAILURE");
if (!ok) process.exitCode = 1;
