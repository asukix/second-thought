import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { review } from "../src/review";
import { GeminiLlmClient } from "../src/adapters/gemini-llm";

let diagnostics: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnostics = vscode.languages.createDiagnosticCollection("lektor");
  context.subscriptions.push(diagnostics);

  const disposable = vscode.commands.registerCommand("lektor.review", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Nincs megnyitott fájl.");
      return;
    }
    const doc = editor.document;
    const source = doc.getText();

    const key = readKey(context);
    if (!key) {
      vscode.window.showErrorMessage("GEMINI_API_KEY nem található a .env-ben.");
      return;
    }

    vscode.window.showInformationMessage("Lektor: review fut...");

    try {
      const llm = new GeminiLlmClient(key);
      const result = await review(doc.fileName, source, llm, 8);

      const diags = result.findings.map((f) => {
        const range = new vscode.Range(
          doc.positionAt(f.range.start),
          doc.positionAt(f.range.end)
        );
        const message = f.suggestion ? `${f.message}\n→ ${f.suggestion}` : f.message;
        const severity =
          f.severity === "error"
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;
        const d = new vscode.Diagnostic(range, message, severity);
        d.source = "Lektor";
        return d;
      });

      diagnostics.set(doc.uri, diags);
      vscode.window.showInformationMessage(`Lektor: ${diags.length} finding.`);
    } catch (err) {
      vscode.window.showErrorMessage(`Lektor hiba: ${err}`);
    }
  });

  context.subscriptions.push(disposable);
}

// A kulcsot a Lektor gyökér .env-jéből olvassuk (shortcut a demóhoz).
function readKey(context: vscode.ExtensionContext): string | undefined {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const envPath = path.join(context.extensionPath, "..", ".env");
    const content = fs.readFileSync(envPath, "utf8");
    const m = content.match(/GEMINI_API_KEY\s*=\s*(.+)/);
    return m?.[1].trim();
  } catch {
    return undefined;
  }
}

export function deactivate() {}