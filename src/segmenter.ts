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
const BLOCK_TYPES = new Set(["paragraph", "heading"]);

const PROTECTED_TYPES = new Set([
  "yaml",              // frontmatter
  "code",
  "inlineCode",
  "mdxJsxFlowElement", // <Image />
  "mdxJsxTextElement", // inline JSX
  "mdxjsEsm",          // import / export
  "mdxFlowExpression",
  "mdxTextExpression",
  "html",
]);

function parse(source: string) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkMdx)
    .parse(source);
}

export function segment(source: string): Segment[] {
  const tree = parse(source);

  const segments: Segment[] = [];

  function walk(node: any) {
    if (BLOCK_TYPES.has(node.type)) {
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      segments.push({
        text: source.slice(start, end),
        range: { start, end },
      });
      return;
    }
    for (const child of node.children ?? []) walk(child);
  }

  walk(tree);
  return segments;
}

export function protectedRanges(source: string): Range[] {
  const ranges: Range[] = [];

  function walk(node: any) {
    if (PROTECTED_TYPES.has(node.type) && node.position) {
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      ranges.push({ start: start, end: end});
      return;
    }
    for (const child of node.children ?? []) walk(child);
  }

  walk(parse(source));
  return ranges;
}

export function overlapsAny(range: Range, ranges: Range[]): boolean {
  return ranges.some((p) => range.start < p.end && p.start < range.end);
}