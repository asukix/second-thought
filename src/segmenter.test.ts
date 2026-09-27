import { describe, test, expect } from "bun:test";
import { overlapsAny, protectedRanges, segment } from "./segmenter";
import { applyEdits } from "./apply";

const MDX = `---
title: "Test"
pubDate: "Jan 1 2026"
---

## The heading

A paragraph with \`inlineCode\` in it.

\`\`\`ts
const x = 1;
\`\`\`

<Image src="a.png" alt="a" />

Another paragraph.

### The subheading
This is a paragraph under the subheading.
`;

describe("segment", () => {
  const segments = segment(MDX);

  test("prose blocks (heading, paragraphs) are extracted", () => {
    const texts = segments.map((s) => s.text);
    expect(texts).toContain("## The heading");
    expect(texts.some((t) => t.startsWith("A paragraph with"))).toBe(true);
    expect(texts).toContain("Another paragraph.");
    expect(texts).toContain("### The subheading");
  });

  test("each segment range points exactly at its text", () => {
    for (const s of segments) {
      expect(MDX.slice(s.range.start, s.range.end)).toBe(s.text);
    }
  });

  test("round-trip: re-inserting every segment reproduces the source byte-for-byte", () => {
    const identityEdits = segments.map((s) => ({ range: s.range, replacement: s.text }));
    expect(applyEdits(MDX, identityEdits)).toBe(MDX);
  });
});

describe("protected content is NOT extracted as prose", () => {
  const segments = segment(MDX);
  const all = segments.map((s) => s.text).join("\n");

  test("frontmatter", () => {
    expect(all).not.toContain("title:");
  });

  test("code block", () => {
    expect(all).not.toContain("const x = 1;");
  });

  test("JSX", () => {
    expect(all).not.toContain("<Image");
  });
});

describe("protectedRanges", () => {
  const ranges = protectedRanges(MDX);
  const texts = ranges.map((r) => MDX.slice(r.start, r.end));

  test("frontmatter is protected", () => {
    expect(texts).toContain('---\ntitle: "Test"\npubDate: "Jan 1 2026"\n---');
  });

  test("inline code is protected", () => {
    expect(texts).toContain("`inlineCode`");
  });

  test("code block is protected", () => {
    expect(texts).toContain("```ts\nconst x = 1;\n```");
  });

  test("JSX is protected", () => {
    expect(texts).toContain('<Image src="a.png" alt="a" />');
  });

  test("plain prose is not protected", () => {
    const at = MDX.indexOf("Another paragraph.");
    expect(overlapsAny({ start: at, end: at + 18 }, ranges)).toBe(false);
  });
});

describe("overlapsAny", () => {
  const guarded = [{ start: 10, end: 20 }];

  test("range inside a protected range overlaps", () => {
    expect(overlapsAny({ start: 12, end: 15 }, guarded)).toBe(true);
  });

  test("partial overlap counts", () => {
    expect(overlapsAny({ start: 5, end: 11 }, guarded)).toBe(true);
  });

  test("touching the boundary is not overlap (half-open)", () => {
    expect(overlapsAny({ start: 20, end: 25 }, guarded)).toBe(false);
    expect(overlapsAny({ start: 5, end: 10 }, guarded)).toBe(false);
  });
});