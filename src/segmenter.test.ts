import { describe, test, expect } from "bun:test";
import { segment } from "./segmenter";
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

  test("protected content is NOT extracted as prose", () => {
    const all = segments.map((s) => s.text).join("\n");
    expect(all).not.toContain("title:");       // frontmatter
    expect(all).not.toContain("const x = 1;"); // code block
    expect(all).not.toContain("<Image");       // JSX
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