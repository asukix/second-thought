import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdx from "remark-mdx";
import type { Range } from "./contract";

// Egy lektorálható blokk: a szövege + hol van az eredetiben.
export interface Segment {
  text: string;
  range: Range;
}

// Ezeket tekintjük önálló review-egységnek.
const BLOCK_TYPES = new Set(["paragraph", "heading"]);

export function segment(source: string): Segment[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkMdx)
    .parse(source);

  const segments: Segment[] = [];

  function walk(node: any) {
    if (BLOCK_TYPES.has(node.type)) {
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      segments.push({
        text: source.slice(start, end),   // a blokk NYERS forrásszövege
        range: { start, end },
      });
      return; // ← ne menjünk a blokkon BELÜLRE, már az egészet elvettük
    }
    for (const child of node.children ?? []) walk(child);
  }

  walk(tree);
  return segments;
}