# Second Thought — backlog

Working list. Tick off what's done and add notes freely.

## Important (before the mentor session)
- [ ] Visibility / project overview (mostly built by me): where the project stands, what it does and how, what the dogfooding taught me — linked from the README, in a form I can present at the mentor session
- [x] Rename to **Second Thought** — subtitle: "an opinionated review harness for MDX writing". npm: `second-thought` (available), short CLI command (`2t` / `sth`). Affects: repo + `package.json` name, CLI, VS Code extension name + command ids (`lektor.review`), diagnostic source ("Lektor"), user-facing text, progress doc, project instructions — in a separate commit
- [ ] Project page on the website: under the `projects` page (astrofy: `src/pages/projects.astro`), with its own page, the README and examples. Examples from the dogfooding: the post-001 thread-safety finding, the "give" → "would give" narrowing, the friendly 429 message instead of raw JSON, before/after diffs

## Tests (goal: a test pyramid by the mentor session)
- [x] Unit: applyEdits (drift, duplicates, insert/delete, no-op)
- [x] Unit: segment round-trip (prose extracted, frontmatter/code intact, ranges)
- [x] Unit: extractJson (fenced vs. plain JSON)
- [x] Unit: pass parsing/position logic with FakeLlmClient
- [x] Integration: review() with a fake pass → full chain → ReviewResult
- [x] E2E: CLI spawned on a fixture article (output + exit code)
- [x] E2E (optional): live LLM smoke test behind an env flag

## Capabilities
- [ ] Code-aware editorial pass: send placeholders for code blocks (e.g. `[code block: swift, 42 lines]`), so it stops asking for examples that are already there (dogfood: "missing example")
- [ ] Support for my own MDX components (`<Image>`, imports) in the segmenter
- [ ] Technical fact-check persona (advisory + evidence: snippet / symbol / grounded URL)
- [ ] Configurable personas / prompts as data
- [ ] Persona per content type (blog / thinking article / deep bit): the editorial pass currently applies an iOS/architecture standard to everything (dogfood: draft-TSS "holiday planning rather than a software architecture problem")
  - Automatic selection by a deterministic rule, not by asking the LLM. Preferred source: a new frontmatter field (e.g. `type: deep-bit`) — explicit and travels with the file; the core already parses frontmatter, so reading it can stay a pure function. Alternative: folder name (`blog/`, `deep-bits/`) — no new field, but implicit and tied to the blog layout. Not `tags`: they serve a different purpose
  - Open questions: what happens without a type (default persona, info finding, or error)? Which source wins if both exist and disagree? Where does the type → persona mapping live (code or config; see "prompts as data")?
- [ ] Change review (VersionSource port + git)
- [ ] Retext-based LanguageCheckPass (rule-based alternative)

## Polish / reliability
- [ ] Re-validate after apply (MDX compile)
- [ ] VS Code: re-run on save, key in SecretStorage, refresh stale diagnostics
- [ ] JSON output mode for the CLI
- [ ] Handle overlapping ranges in apply
- [ ] Prose embedded in frontmatter
- [ ] Careful review of selected frontmatter fields (title/description/alt) — that's where the densest language errors sit (dogfood lesson)
- [ ] Segmenter: tolerate bare HTML tags (e.g. an unclosed `<br>`) — today it becomes a parse-error finding, but the prose is unreachable (dogfood: bit-004)
- [ ] Group repeated identical errors: if the same fix occurs several times in an article (dogfood: "bult in" → "built-in" consistently), one finding with a "fix all" option — less noise
- [ ] VS Code: language and editorial underlines overlap (dogfood: draft-TSS "example:"). Option: editorial `Information` → `Hint` (less prominent, but not shown in the Problems panel) — needs a decision
- [ ] Language prompt tuning: don't suggest optional commas, and don't swap British/American spelling (dogfood: "learnt" → "learned", commas after introductory clauses)
- [ ] Progress while running instead of "review fut...": which pass is running, whether it's done, and how long a retry (429) is waiting. The core must not know the frontend: an optional `onProgress` callback or progress events from `review()` and the adapter; VS Code shows it with `withProgress`, the CLI writes it to stderr
- [ ] User-facing CLI and extension text in English (some messages are still Hungarian, e.g. "Nincs alkalmazható javaslat.", "Hiba: …")

## Distribution / hygiene
- [x] Git hygiene: vscode-extension/dist/ + node_modules/ in .gitignore
- [x] Push to GitHub: https://github.com/asukix/second-thought (MIT, public)
- [ ] README (what it does, architecture, how to run)
- [ ] `vscode-extension/package.json`: declare `esbuild` as a devDependency (it's only in the lockfile, so a fresh clone can't build)
- [ ] Move the dev scripts (`explore.ts`, `list-models.ts`) to `scripts/` or remove them
- [ ] Short CLI command (`2t` / `sth`) via the `bin` field — left out of the rename because it's a new feature, not a name
- [ ] Swift shell (milestone 7)
