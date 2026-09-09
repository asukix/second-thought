import { readFileSync, existsSync } from "node:fs";
import { languagePass } from "./passes/language";
import { GeminiLlmClient } from "./adapters/gemini-llm";
import { applyEdits, type Edit } from "./apply";
import { makeDiff } from "./diff";
import type { ReviewResult } from "./contract";

const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY hiányzik a .env-ből");

const file = "content/mdsample.md";
if (!existsSync(file)) throw new Error(`A fájl nem található: ${file}`);

const source = readFileSync(file, "utf8");
if (source.trim() === "") throw new Error(`A fájl üres: ${file}`);

const llm = new GeminiLlmClient(key);

const findings = await languagePass(source, llm, 5);

const edits: Edit[] = findings
  .filter((f) => f.suggestion !== undefined)
  .map((f) => ({ range: f.range, replacement: f.suggestion! }));

const corrected = applyEdits(source, edits);

const diff = makeDiff(file, source, corrected);

const result: ReviewResult = { file, findings, diff };

console.log(`Findingok: ${result.findings.length} (ebből ${edits.length} alkalmazható)\n`);
console.log("--- DIFF ---\n");
console.log(result.diff);