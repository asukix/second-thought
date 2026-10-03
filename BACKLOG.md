# Second Thought — backlog

Munka-lista. Pipáld/húzd át, amit kész, és írj hozzá bármit. Szabadon szerkeszd.

## Fontos (mentori session előtt)
- [ ] Láthatóság / projekt-áttekintés (főleg én építem): hol tart a projekt, mit és hogyan csinál, milyen tapasztalatok jöttek a dogfoodból — a README-hez kapcsolva, a mentori sessionön bemutatható formában
- [x] Átnevezés: **Second Thought** — alcím: „an opinionated review harness for MDX writing". npm: `second-thought` (szabad), CLI-parancs rövid névvel (`2t` / `sth`). Érinti: repo + `package.json` név, CLI, VS Code extension név + parancsazonosítók (`lektor.review`), diagnosztika forrás („Lektor"), felhasználói szövegek, progress doksi, projekt-utasítások — egy külön commitban
- [ ] Bemutató a weboldalon: a projekt a `projects` oldal alá (astrofy: `src/pages/projects.astro`), saját bemutató oldallal, README-vel és példákkal. Példa-anyag a dogfoodból: post-001 thread-safety finding, „give" → „would give" szűkítés, barátságos 429-üzenet a nyers JSON helyett, előtte/utána diffek

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
- [ ] Persona tartalomtípusonként (blog / thinking article / deep bit): az editorial most mindenre iOS/architektúra mércét alkalmaz (dogfood: draft-TSS „holiday planning rather than a software architecture problem")
- [ ] Változás-vizsgálat (VersionSource port + git)
- [ ] Retext-alapú LanguageCheckPass (alternatíva)

## Csiszolás / megbízhatóság
- [ ] Re-validate apply után (MDX compile)
- [ ] VS Code: re-run on save, SecretStorage-kulcs, stale-diagnostika frissítés
- [ ] JSON kimeneti mód a CLI-nek
- [ ] Átfedő range-ek kezelése az apply-ban
- [ ] Frontmatterbe ágyazott próza
- [ ] Frontmatter kijelölt mezőinek (title/description/alt) óvatos lektorálása — a legsűrűbb nyelvi hibák ott ülnek (dogfood-tanulság)
- [ ] Szegmentáló: csupasz HTML-tag tolerancia (pl. lezáratlan `<br>`) — most parse-error findinggé szelídül, de a próza elérhetetlen (dogfood: bit-004)
- [ ] Ismétlődő azonos hiba csoportosítása: ha ugyanaz a javítás többször előfordul a cikkben (dogfood: „bult in" → „built-in" következetesen), egy finding „mindet javítja" opcióval — kevesebb zaj
- [ ] VS Code: a language és az editorial aláhúzás egymásra csúszik (dogfood: draft-TSS „example:"). Opció: editorial `Information` → `Hint` (kevésbé feltűnő, de nem látszik a Problems panelen) — döntés kell
- [ ] Language prompt hangolás: ne javasoljon opcionális vesszőt, és ne cserélje a brit/amerikai helyesírást (dogfood: „learnt" → „learned", bevezető tagmondat utáni vesszők)
- [ ] Futás közbeni progress a „review fut...” helyett: melyik passz fut, kész-e, és ha a retry vár (429), mennyit. A mag ne ismerje a frontendet: opcionális `onProgress` callback vagy progress-esemény a `review()`-ból és az adapterből; a VS Code `withProgress`-szel, a CLI stderr-re írja ki

## Terjesztés / higiénia
- [ ] git-higiénia: vscode-extension/dist/ + node_modules/ gitignore
- [ ] Push GitHubra (remote; munkanév: porygon)
- [ ] README (mit csinál, architektúra, futtatás)
- [ ] Rövid CLI-parancs (`2t` / `sth`) `bin` mezővel — az átnevezésből kimaradt, mert új funkció, nem név
- [ ] Swift shell (7. mérföldkő)
