export type MarkdownBlockNode =
  | MarkdownHeadingNode
  | MarkdownParagraphNode
  | MarkdownCodeBlockNode
  | MarkdownListNode;

export interface MarkdownHeadingNode {
  readonly type: "heading";
  readonly depth: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
}

export interface MarkdownParagraphNode {
  readonly type: "paragraph";
  readonly text: string;
}

export interface MarkdownCodeBlockNode {
  readonly type: "code";
  readonly lang?: string;
  readonly code: string;
}

export interface MarkdownListNode {
  readonly type: "list";
  readonly ordered: boolean;
  readonly items: readonly string[];
}

export interface MarkdownRenderContext {
  readonly source: string;
}

export interface MarkdownRenderPlugin {
  transformBlock?: (
    block: MarkdownBlockNode,
    context: MarkdownRenderContext,
  ) => MarkdownBlockNode | readonly MarkdownBlockNode[] | null;
  renderBlock?: (
    block: MarkdownBlockNode,
    context: MarkdownRenderContext,
    next: (block: MarkdownBlockNode) => string,
  ) => string | undefined;
  postprocessHtml?: (html: string, context: MarkdownRenderContext) => string;
}

export interface RenderMarkdownOptions {
  readonly plugins?: readonly MarkdownRenderPlugin[];
}

export function renderMarkdownToHtml(
  markdown: string,
  options: RenderMarkdownOptions = {},
): string {
  const context: MarkdownRenderContext = { source: markdown };
  const initialBlocks = parseMarkdownBlocks(markdown);
  const transformedBlocks = applyBlockTransforms(
    initialBlocks,
    options.plugins ?? [],
    context,
  );

  const html = transformedBlocks
    .map((block) =>
      renderBlockWithPlugins(block, options.plugins ?? [], context),
    )
    .join("\n");

  return applyHtmlPostprocess(html, options.plugins ?? [], context);
}

function parseMarkdownBlocks(markdown: string): MarkdownBlockNode[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlockNode[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    const fencedCode = parseFencedCode(lines, index);
    if (fencedCode) {
      blocks.push(fencedCode.block);
      index = fencedCode.nextIndex;
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      blocks.push(heading);
      index += 1;
      continue;
    }

    const list = parseList(lines, index);
    if (list) {
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    const paragraph = parseParagraph(lines, index);
    blocks.push(paragraph.block);
    index = paragraph.nextIndex;
  }

  return blocks;
}

function parseFencedCode(
  lines: readonly string[],
  startIndex: number,
): { block: MarkdownCodeBlockNode; nextIndex: number } | null {
  const startLine = lines[startIndex] ?? "";
  const startMatch = startLine.match(/^```\s*([a-zA-Z0-9_-]+)?\s*$/);
  if (!startMatch) {
    return null;
  }

  const lang = startMatch[1]?.trim();
  const bodyLines: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (/^```\s*$/.test(line)) {
      return {
        block: {
          type: "code",
          lang: lang && lang.length > 0 ? lang : undefined,
          code: bodyLines.join("\n"),
        },
        nextIndex: index + 1,
      };
    }

    bodyLines.push(line);
    index += 1;
  }

  return {
    block: {
      type: "code",
      lang: lang && lang.length > 0 ? lang : undefined,
      code: bodyLines.join("\n"),
    },
    nextIndex: lines.length,
  };
}

function parseHeading(line: string): MarkdownHeadingNode | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) {
    return null;
  }

  const depth = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
  return {
    type: "heading",
    depth,
    text: match[2].trim(),
  };
}

function parseList(
  lines: readonly string[],
  startIndex: number,
): { block: MarkdownListNode; nextIndex: number } | null {
  const firstLine = lines[startIndex] ?? "";
  const orderedMatch = firstLine.match(/^\d+\.\s+(.+)$/);
  const unorderedMatch = firstLine.match(/^[-*+]\s+(.+)$/);

  if (!orderedMatch && !unorderedMatch) {
    return null;
  }

  const ordered = Boolean(orderedMatch);
  const itemPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;
  const items: string[] = [];

  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const itemMatch = line.match(itemPattern);
    if (!itemMatch) {
      break;
    }

    items.push(itemMatch[1].trim());
    index += 1;
  }

  return {
    block: {
      type: "list",
      ordered,
      items,
    },
    nextIndex: index,
  };
}

function parseParagraph(
  lines: readonly string[],
  startIndex: number,
): { block: MarkdownParagraphNode; nextIndex: number } {
  const paragraphLines: string[] = [];

  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0) {
      break;
    }

    if (parseHeading(line) || /^```/.test(line)) {
      break;
    }

    if (/^\d+\.\s+/.test(line) || /^[-*+]\s+/.test(line)) {
      break;
    }

    paragraphLines.push(line.trim());
    index += 1;
  }

  return {
    block: {
      type: "paragraph",
      text: paragraphLines.join(" "),
    },
    nextIndex: index,
  };
}

function applyBlockTransforms(
  blocks: readonly MarkdownBlockNode[],
  plugins: readonly MarkdownRenderPlugin[],
  context: MarkdownRenderContext,
): MarkdownBlockNode[] {
  let current = [...blocks];

  for (const plugin of plugins) {
    if (!plugin.transformBlock) {
      continue;
    }

    const next: MarkdownBlockNode[] = [];
    for (const block of current) {
      const transformed = plugin.transformBlock(block, context);
      if (transformed === null) {
        continue;
      }

      if (isBlockList(transformed)) {
        next.push(...transformed);
      } else {
        next.push(transformed);
      }
    }

    current = next;
  }

  return current;
}

function renderBlockWithPlugins(
  block: MarkdownBlockNode,
  plugins: readonly MarkdownRenderPlugin[],
  context: MarkdownRenderContext,
): string {
  const renderDefault = (node: MarkdownBlockNode): string => renderBlock(node);

  let renderer = renderDefault;
  for (let index = plugins.length - 1; index >= 0; index -= 1) {
    const plugin = plugins[index];
    const current = renderer;
    renderer = (node: MarkdownBlockNode): string => {
      if (!plugin.renderBlock) {
        return current(node);
      }

      const rendered = plugin.renderBlock(node, context, current);
      return rendered ?? current(node);
    };
  }

  return renderer(block);
}

function applyHtmlPostprocess(
  html: string,
  plugins: readonly MarkdownRenderPlugin[],
  context: MarkdownRenderContext,
): string {
  return plugins.reduce((currentHtml, plugin) => {
    if (!plugin.postprocessHtml) {
      return currentHtml;
    }

    return plugin.postprocessHtml(currentHtml, context);
  }, html);
}

function isBlockList(
  value: MarkdownBlockNode | readonly MarkdownBlockNode[],
): value is readonly MarkdownBlockNode[] {
  return Array.isArray(value);
}

function renderBlock(block: MarkdownBlockNode): string {
  if (block.type === "heading") {
    return `<h${block.depth}>${renderInline(block.text)}</h${block.depth}>`;
  }

  if (block.type === "paragraph") {
    return `<p>${renderInline(block.text)}</p>`;
  }

  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    const items = block.items
      .map((item) => `<li>${renderInline(item)}</li>`)
      .join("");
    return `<${tag}>${items}</${tag}>`;
  }

  const languageClass = block.lang
    ? ` class="language-${escapeHtmlAttribute(block.lang)}"`
    : "";
  return `<pre><code${languageClass}>${escapeHtml(block.code)}</code></pre>`;
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);

  const codeProcessed = escaped.replace(/`([^`]+)`/g, (_, code: string) => {
    return `<code>${code}</code>`;
  });

  const boldProcessed = codeProcessed.replace(
    /\*\*([^*]+)\*\*/g,
    (_, text: string) => {
      return `<strong>${text}</strong>`;
    },
  );

  const emphasisProcessed = boldProcessed.replace(
    /\*([^*]+)\*/g,
    (_, text: string) => {
      return `<em>${text}</em>`;
    },
  );

  return emphasisProcessed.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label: string, href: string) => {
      const safeHref = escapeHtmlAttribute(href);
      return `<a href="${safeHref}">${label}</a>`;
    },
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
