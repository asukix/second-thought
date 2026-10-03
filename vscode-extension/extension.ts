import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { review } from "../src/review";
import { GeminiLlmClient } from "../src/adapters/gemini-llm";
import { languagePass } from "../src/passes/language";
import { editorialPass } from "../src/passes/editorial";
import type { Severity } from "../src/contract";
import { toUserMessage } from "../src/presentation/messages";

let diagnostics: vscode.DiagnosticCollection;

// Diagnostic source: set on every finding and matched by the quick-fix provider.
const SOURCE = "Second Thought";

function toVsSeverity(severity: Severity): vscode.DiagnosticSeverity {
  switch (severity) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "info":
      return vscode.DiagnosticSeverity.Information;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
  }
}

export function activate(context: vscode.ExtensionContext) {
  diagnostics = vscode.languages.createDiagnosticCollection("second-thought");
  context.subscriptions.push(diagnostics);

  const runCmd = vscode.commands.registerCommand("secondThought.review", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Nincs megnyitott fájl.");
      return;
    }
    const doc = editor.document;
    if (doc.getText().trim() === "") {
      vscode.window.showInformationMessage(`${SOURCE}: empty file, nothing to review.`);
      return;
    }
    const key = readKey(context);
    if (!key) {
      vscode.window.showErrorMessage("GEMINI_API_KEY nem található a .env-ben.");
      return;
    }

    vscode.window.showInformationMessage(`${SOURCE}: review fut...`);
    try {
      const llm = new GeminiLlmClient(key);
      const result = await review(doc.fileName, doc.getText(), llm, [languagePass, editorialPass]);

      const diags = result.findings.map((f) => {
        const range = new vscode.Range(
          doc.positionAt(f.range.start),
          doc.positionAt(f.range.end)
        );
        const text = toUserMessage(f);
        const message = f.suggestion ? `${text}\n→ ${f.suggestion}` : text;
        const severity = toVsSeverity(f.severity);
        const d = new vscode.Diagnostic(range, message, severity);
        d.source = SOURCE;
        (d as any).suggestion = f.suggestion; // a provider innen veszi
        return d;
      });

      diagnostics.set(doc.uri, diags);
      vscode.window.showInformationMessage(`${SOURCE}: ${diags.length} finding.`);
    } catch (err) {
      vscode.window.showErrorMessage(`${SOURCE} hiba: ${err}`);
    }
  });
  context.subscriptions.push(runCmd);

  // A quick-fix provider: apply the suggestion from the diagnostic
  const fixProvider = vscode.languages.registerCodeActionsProvider(
    [{ language: "markdown" }, { language: "mdx" }],
    new SecondThoughtFixProvider(),
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
  );
  context.subscriptions.push(fixProvider);
}

// The quick-fix title shows the actual change (original → suggestion), shortened with "…".
function quickFixTitle(original: string, suggestion: string): string {
  const short = (s: string) => (s.length > 40 ? s.slice(0, 39) + "…" : s);
  return `${SOURCE}: "${short(original)}" → "${short(suggestion)}"`;
}

class SecondThoughtFixProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    for (const diag of context.diagnostics) {
      if (diag.source !== SOURCE) continue;
      const suggestion = (diag as any).suggestion as string | undefined;
      if (!suggestion) continue;

      const action = new vscode.CodeAction(
        quickFixTitle(document.getText(diag.range), suggestion),
        vscode.CodeActionKind.QuickFix
      );
      action.diagnostics = [diag];
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, diag.range, suggestion);
      action.edit = edit;
      actions.push(action);
    }
    return actions;
  }
}

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