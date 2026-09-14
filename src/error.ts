export const errorMessages = {
  usage: "Használat: bun run review <fájl.mdx>",
  fileNotFound: (f: string) => `A fájl nem található: ${f}`,
  fileEmpty: (f: string) => `A fájl üres: ${f}`,
  missingKey: "GEMINI_API_KEY hiányzik a .env-ből",
};