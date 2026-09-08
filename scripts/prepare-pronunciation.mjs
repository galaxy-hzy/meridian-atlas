import { pinyin } from "pinyin-pro";
import { readFileSync, writeFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const r of rows) {
  const chars = Array.from(r.name);
  const normalized = r.sourcePinyin
    .toLowerCase()
    .replace(/[\s’']/g, "")
    .replaceAll("ɡ", "g");
  // Additional syllables from the pinned headings; do not override a single
  // character's readings in arbitrary prose.
  const extra = { 俞: ["shū"], 譩: ["yì"], 譆: ["xǐ"], 颈: ["jìng"] };
  function split(index, tail) {
    if (index === chars.length) return tail ? null : [];
    for (const py of [
      ...pinyin(chars[index], {
        multiple: true,
        type: "array",
        toneSandhi: false,
      }),
      ...(extra[chars[index]] || []),
    ]) {
      if (!tail.startsWith(py)) continue;
      const rest = split(index + 1, tail.slice(py.length));
      if (rest) return [py, ...rest];
    }
    return null;
  }
  r.syllables = split(0, normalized);
  if (!r.syllables || r.syllables.join("") !== normalized)
    throw new Error("Review source pinyin: " + r.name);
  if (r.name.includes("俞"))
    r.note =
      "本工具按国标穴名标注 shū；字典中“俞”通“腧”另读 shù，保留这一用音差异。";
  if (r.name === "譩譆")
    r.note = "国标穴名标注 Yìxǐ，与通用字库的 yī xī 不同；此处保留国标标注。";
  if (r.name === "颈百劳") {
    r.syllables[0] = "jǐng";
    r.note =
      "原 PDF 标作 Jìngbǎiláo；此处“颈”按字典颈部义读 jǐng，并保留原标注供核对。";
  }
}
writeFileSync(
  "lib/point-pronunciation.json",
  JSON.stringify(rows, null, 2) + "\n",
);
console.log("Prepared " + rows.length + " source-linked point pronunciations");
