import { readFileSync } from "node:fs";
import { segment } from "./segmenter";
import { applyEdits, type Edit } from "./apply";

const source = readFileSync("content/mdsample.md", "utf8");
const segments = segment(source);

// Három hamis javítás, KÜLÖNBÖZŐ hosszúságú cserékkel — hogy a drift számítson.
const edits: Edit[] = [
  { range: segments[0].range, replacement: "## EGY (sokkal hosszabb címsor)" },
  { range: segments[2].range, replacement: "## KETTŐ" },
  { range: segments[5].range, replacement: "## HÁROM" },
];

const result = applyEdits(source, edits);

// Ellenőrzés: minden csere a helyén van-e?
// Az új pozíció = eredeti start + az ELŐTTE lévő cserék hosszkülönbségének összege.
const ascending = [...edits].sort((a, b) => a.range.start - b.range.start);
let delta = 0;
let mindOk = true;

for (const e of ascending) {
  const newStart = e.range.start + delta;
  const landed = result.slice(newStart, newStart + e.replacement.length);
  const ok = landed === e.replacement;
  if (!ok) mindOk = false;
  console.log(`${ok ? "✓" : "✗"} @${newStart}: ${JSON.stringify(landed)}`);
  // frissítjük a driftet: mennyivel lett hosszabb/rövidebb ez a csere
  delta += e.replacement.length - (e.range.end - e.range.start);
}

console.log("Mind a helyén:", mindOk);
console.log("Hosszak stimmelnek:", result.length === source.length + delta);