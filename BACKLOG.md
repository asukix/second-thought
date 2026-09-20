# Lektor — backlog

Munka-lista. Pipáld/húzd át, amit kész, és írj hozzá bármit. Szabadon szerkeszd.

## Tesztek (cél: piramis a mentori sessionig)
- [x] Unit: applyEdits (drift, duplikátum, insert/delete, no-op)
- [x] Unit: segment round-trip (próza kijön, frontmatter/kód sértetlen, range-ek)
- [x] Unit: extractJson (kerítéses vs. sima JSON)
- [x] Unit: passzok parse/pozíció-logika FakeLlmClienttel
- [x] Integráció: review() fake passzal → teljes lánc → ReviewResult
- [x] E2E: CLI spawn egy fixture-cikken (kimenet + exit-kód)
- [x] E2E (opc.): élő-LLM smoke, env-flag mögött

## Képességek
- [ ] Technical fact-check persona (advisory + bizonyíték: snippet/szimbólum/groundingos URL)
- [ ] Konfigurálható personák / prompt-mint-adat
- [ ] Változás-vizsgálat (VersionSource port + git)
- [ ] Retext-alapú LanguageCheckPass (alternatíva)

## Csiszolás / megbízhatóság
- [ ] Re-validate apply után (MDX compile)
- [ ] VS Code: re-run on save, SecretStorage-kulcs, stale-diagnostika frissítés
- [ ] JSON kimeneti mód a CLI-nek
- [ ] Átfedő range-ek kezelése az apply-ban
- [ ] Frontmatterbe ágyazott próza

## Terjesztés / higiénia
- [ ] git-higiénia: vscode-extension/dist/ + node_modules/ gitignore
- [ ] Push GitHubra (remote; munkanév: porygon)
- [ ] README (mit csinál, architektúra, futtatás)
- [ ] Swift shell (7. mérföldkő)
