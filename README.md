# Second Thought

An opinionated review harness for MDX writing.

<!-- 2-3 mondat: mit csinál (language + editorial pass), mit NEM bánt
     (frontmatter, kód, JSX), és hogy minden javaslat diffként jön. -->

<!-- Demó kép/GIF: VS Code quick fix. Amíg nincs, maradjon ki, ne placeholder. -->

## Status

Second-thought is a lektor tool to help myself writing bolog posts, deep bits, thinking bits and thinking articles.
Currently it handles standard md and my plan to handle my own mdx format as well.
It contains 2 AI assistant: language lektor and editoral lektor.

## Quick start

**Requirements:** [Bun](https://bun.com) (developed on 1.4) and a Gemini API key.
You can get a free key in [Google AI Studio](https://aistudio.google.com/apikey).
The default model is `gemini-3.5-flash-lite`.

```bash
git clone https://github.com/asukix/second-thought.git
cd second-thought
bun install
echo "GEMINI_API_KEY=your-key-here" > .env   # .env is git-ignored
bun run review path/to/post.md
```

Run it from the repository root: Bun loads `.env` from the current directory.
The file you review can live anywhere.

Second Thought never writes to your file. It prints the findings and a unified diff
of the suggestions it could apply, and you decide what to keep.

**Example output** (abridged, from a real run on one of my posts):

```text
3 finding (post-008-mvvm-model-confusions.md):

- [language] punctuation: Remove the comma before the restrictive relative clause.
○ [editorial] missing concrete example: The text references code snippets and properties
  that are entirely missing from the text, leaving the L3 concrete example incomplete.
○ [editorial] prescriptive instead of trade-off: The conclusion takes a rigid, definitive
  stance on nomenclature rather than framing the trade-off of different naming conventions.

--- DIFF ---

@@ -253,5 +253,5 @@
 ## My question

-What is the `MenuItemModel`, that is used by `MenuViewModel`?
+What is the `MenuItemModel` that is used by `MenuViewModel`?
```

`✗` marks an error, `•` a warning, and `○` an editorial note. Editorial notes are advice
and never come with an edit. When a language fix can't be narrowed to the changed words,
the line ends with `(edit: llm)` or `(edit: sentence)`.

**Free tier limits:** each file takes two requests, one per pass. On a 429, the client
backs off and retries, so a large batch gets slower but doesn't fail.

## VS Code extension

VS Code extension part helps to run and use the tool directly from the VS Code.
### Steps to use
- Build the tool:
```bash
git vscode-extension
bun run build
```
- Open the project's vscode-extensions folder from VS Code
- Press F5 - The project will run
- Open your article that you want to analyse
- Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run the tool: 
  `>Second Thought: ReviewCurrentFile`

The languge modul will underline the spellings and the language mismatches. It also offers fixes.
The editoral modul will underline the thoughts if you forget the code example, or it mismatch your way

## How it works

<!-- A mechanizmus, nem a miért: parse → protected ranges → passes → guard → diff.
     5-6 sor vagy egy kis ábra. Link a projektoldalra a döntésekhez. -->

## Project structure

<!-- src/ fa, soronként egy szerep: contract, segmenter, review (Context),
     passes (Strategy), ports, adapters, presentation, cli. Ez mutatja meg
     a hexagonális felépítést kódszinten. -->

## Testing

<!-- bun test; mit fed le röviden; SECOND_THOUGHT_LIVE=1 az élő smoke-hoz. -->

## Roadmap

<!-- 3-4 tétel (placeholderek, MDX-támogatás, persona per tartalomtípus, Swift app),
     a többi: link a BACKLOG.md-re. -->

## License

MIT