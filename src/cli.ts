import { readFileSync, existsSync } from "node:fs";
import { review } from "./review";
import { GeminiLlmClient } from "./adapters/gemini-llm";

const file = process.argv[2];
if (!file) {
  console.error("Használat: bun run review <fájl.mdx>");
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`A fájl nem található: ${file}`);
  process.exit(1);
}

const source = readFileSync(file, "utf8");
if (source.trim() === "") {
  console.error(`A fájl üres: ${file}`);
  process.exit(1);
}

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY hiányzik a .env-ből");
  process.exit(1);
}

const llm = new GeminiLlmClient(key);
const result = await review(file, source, llm, 5);

console.log(`\n${result.findings.length} finding (${result.file}):\n`);
for (const f of result.findings) {
  const marker = f.severity === "error" ? "✗" : "•";
  console.log(`${marker} [${f.range.start}-${f.range.end}] ${f.category}: ${f.message}`);
}

if (result.diff) {
  console.log("\n--- DIFF ---\n");
  console.log(result.diff);
} else {
  console.log("\nNincs alkalmazható javaslat.");
}