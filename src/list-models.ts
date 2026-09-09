const key = process.env.GEMINI_API_KEY;

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
);
const data = await res.json();

for (const m of data.models ?? []) {
  const methods = m.supportedGenerationMethods?.join(", ") ?? "";
  if (methods.includes("generateContent")) {
    console.log(m.name, "→", methods);
  }
}