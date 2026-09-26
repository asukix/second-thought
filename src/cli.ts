import { readFileSync, existsSync } from "node:fs";
import { review } from "./review";
import { GeminiLlmClient } from "./adapters/gemini-llm";
import { languagePass } from "./passes/language";
import { editorialPass } from "./passes/editorial";
import { errorMessages } from "./error";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error(errorMessages.usage);
  if (!existsSync(file)) throw new Error(errorMessages.fileNotFound(file));

  const source = readFileSync(file, "utf8");
  if (source.trim() === "") throw new Error(errorMessages.fileEmpty(file));

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error(errorMessages.missingKey);

  const llm = new GeminiLlmClient(key);
  const result = await review(file, source, llm, [languagePass, editorialPass]);

  console.log(`\n${result.findings.length} finding (${result.file}):\n`);
  for (const f of result.findings) {
    const marker = f.severity === "error" ? "✗" : f.severity === "info" ? "○" : "•";
    console.log(`${marker} [${f.passId}] ${f.category}: ${f.message}`);
  }
  if (result.diff) {
    console.log("\n--- DIFF ---\n");
    console.log(result.diff);
  } else {
    console.log("\nNincs alkalmazható javaslat.");
  }
}

main().catch((err) => {
  console.error(`Hiba: ${err.message}`);
  process.exit(1);
});