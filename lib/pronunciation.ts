import { pinyin } from "pinyin-pro";
import pointReadings from "./point-pronunciation.json";

export const pronunciationLimit = 500;
const ordered = [...pointReadings].sort(
  (a, b) => b.name.length - a.name.length,
);
export type PronunciationUnit = {
  text: string;
  reading: string;
  readings: string[];
  unknown: boolean;
};
export function lookupPronunciation(input: string) {
  const text = Array.from(input.trim()).slice(0, pronunciationLimit).join("");
  const units: PronunciationUnit[] = [];
  const matched = new Map<string, (typeof pointReadings)[number]>();
  const generic = (part: string) => {
    for (const unit of pinyin(part, { type: "all", toneSandhi: false })) {
      units.push({
        text: unit.origin,
        reading: unit.isZh ? unit.pinyin : "",
        readings: unit.isZh ? unit.polyphonic : [],
        unknown: !unit.isZh && /\p{Script=Han}/u.test(unit.origin),
      });
    }
  };
  // Longest point names take precedence, including within an unspaced song.
  // Ordinary prose still uses contextual dictionary readings, not global
  // character overrides (e.g. the surname 俞 must remain readable as yú).
  let cursor = 0;
  let pending = "";
  while (cursor < text.length) {
    const match = ordered.find((r) => text.startsWith(r.name, cursor));
    if (!match) {
      const char = String.fromCodePoint(text.codePointAt(cursor)!);
      pending += char;
      cursor += char.length;
      continue;
    }
    if (pending) {
      generic(pending);
      pending = "";
    }
    Array.from(match.name).forEach((char, index) =>
      units.push({
        text: char,
        reading: match.syllables[index],
        readings: [
          ...new Set([
            match.syllables[index],
            ...pinyin(char, {
              multiple: true,
              type: "array",
              toneSandhi: false,
            }),
          ]),
        ],
        unknown: false,
      }),
    );
    matched.set(match.id, match);
    cursor += match.name.length;
  }
  if (pending) generic(pending);
  return { text, units, sources: [...matched.values()] };
}
export type PronunciationResult = ReturnType<typeof lookupPronunciation>;
export function pronunciationSourceUrl(standard: string, page: number) {
  const file =
    standard === "GB/T 12346-2021"
      ? "202306192125376309"
      : "202306192147233032";
  return `https://www.ntcamsac.ac.cn/upload/std_info/${file}.pdf#page=${page}`;
}
