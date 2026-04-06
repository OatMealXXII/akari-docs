import type { Plugin } from "vite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Marked, marked, type TokensList } from "marked";

type FrontmatterValue = string | number | boolean;

export interface AkariMarkdownHeading {
  readonly level: number;
  readonly text: string;
  readonly id: string;
}

export interface AkariMarkdownDocument {
  readonly id: string;
  readonly content: string;
  readonly metadata: Readonly<Record<string, FrontmatterValue>>;
}

export interface AkariMarkdownRenderOutput {
  readonly html: string;
  readonly metadata: Readonly<Record<string, FrontmatterValue>>;
  readonly headings: readonly AkariMarkdownHeading[];
}

export interface AkariMarkdownHook {
  transform?: (document: AkariMarkdownDocument) => AkariMarkdownDocument;
  render?: (
    document: AkariMarkdownDocument,
    next: (document: AkariMarkdownDocument) => AkariMarkdownRenderOutput,
  ) => AkariMarkdownRenderOutput | undefined;
  transformHtml?: (
    html: string,
    document: AkariMarkdownDocument,
  ) => string | undefined;
}

export interface AkariMarkdownPluginOptions {
  readonly hooks?: readonly AkariMarkdownHook[];
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const VIRTUAL_INDEX_ID = "virtual:akari-md-index";
const RESOLVED_VIRTUAL_INDEX_ID = `\0${VIRTUAL_INDEX_ID}`;

const markedParser = new Marked({
  gfm: true,
  breaks: false,
});

export function akariMarkdownPlugin(
  options: AkariMarkdownPluginOptions = {},
): Plugin {
  return {
    name: "akari-markdown-plugin",
    enforce: "pre",
    resolveId(id: string): string | null {
      if (id === VIRTUAL_INDEX_ID) {
        return RESOLVED_VIRTUAL_INDEX_ID;
      }

      return null;
    },
    load(id: string): string | null {
      if (id !== RESOLVED_VIRTUAL_INDEX_ID) {
        return null;
      }

      const index = buildMarkdownIndex();
      return `export const markdownIndex = ${JSON.stringify(index)};`;
    },
    transform(code: string, id: string): string | null {
      const fileId = id.split("?", 1)[0] ?? "";
      if (!fileId.endsWith(".md")) {
        return null;
      }

      const parsed = parseMarkdownSource(code, fileId);
      const transformed = transformMarkdownDocument(
        parsed,
        options.hooks ?? [],
      );
      const rendered = renderMarkdownDocument(transformed, options.hooks ?? []);

      return [
        'import { defineComponent, h } from "vue";',
        `export const metadata = ${JSON.stringify(rendered.metadata)};`,
        `export const headings = ${JSON.stringify(rendered.headings)};`,
        "export default defineComponent({",
        '  name: "AkariMarkdownDocument",',
        "  render() {",
        `    return h("article", { class: "akari-prose", innerHTML: ${JSON.stringify(rendered.html)} });`,
        "  },",
        "});",
      ].join("\n");
    },
  };
}

interface MarkdownIndexItem {
  readonly slug: string;
  readonly href: string;
  readonly label: string;
  readonly metadata: Readonly<Record<string, FrontmatterValue>>;
  readonly headings: readonly AkariMarkdownHeading[];
}

function buildMarkdownIndex(): readonly MarkdownIndexItem[] {
  const rootDir = process.cwd();
  const contentDir = path.resolve(rootDir, "src", "content");
  const files = readdirSync(contentDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((fileName) => {
    const absolutePath = path.join(contentDir, fileName);
    const source = readFileSync(absolutePath, "utf8");
    const parsed = parseMarkdownSource(source, absolutePath);
    const slug = fileName.replace(/\.md$/, "");
    const headings = extractHeadings(parsed.content);
    const title = parsed.metadata.title;
    const label =
      typeof title === "string" && title.trim().length > 0
        ? title
        : titleFromSlug(slug);

    return {
      slug,
      href: `/${slug}`,
      label,
      metadata: parsed.metadata,
      headings,
    };
  });
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function parseMarkdownSource(
  source: string,
  id: string,
): AkariMarkdownDocument {
  const match = source.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      id,
      content: source,
      metadata: {},
    };
  }

  const frontmatterBlock = match[1] ?? "";
  const metadata = parseFrontmatterBlock(frontmatterBlock);

  return {
    id,
    content: source.slice(match[0].length),
    metadata,
  };
}

function transformMarkdownDocument(
  document: AkariMarkdownDocument,
  hooks: readonly AkariMarkdownHook[],
): AkariMarkdownDocument {
  return hooks.reduce((current, hook) => {
    if (!hook.transform) {
      return current;
    }

    return hook.transform(current);
  }, document);
}

function renderMarkdownDocument(
  document: AkariMarkdownDocument,
  hooks: readonly AkariMarkdownHook[],
): AkariMarkdownRenderOutput {
  const defaultRenderer = (
    currentDocument: AkariMarkdownDocument,
  ): AkariMarkdownRenderOutput => {
    const rendered = renderBasicMarkdown(currentDocument.content);
    return {
      html: rendered.html,
      metadata: currentDocument.metadata,
      headings: rendered.headings,
    };
  };

  let renderer = defaultRenderer;
  for (let index = hooks.length - 1; index >= 0; index -= 1) {
    const hook = hooks[index];
    const current = renderer;

    renderer = (
      currentDocument: AkariMarkdownDocument,
    ): AkariMarkdownRenderOutput => {
      if (!hook.render) {
        return current(currentDocument);
      }

      const result = hook.render(currentDocument, current);
      return result ?? current(currentDocument);
    };
  }

  const rendered = renderer(document);
  return {
    html: applyHtmlTransforms(rendered.html, document, hooks),
    metadata: rendered.metadata,
    headings: rendered.headings,
  };
}

function extractHeadings(content: string): readonly AkariMarkdownHeading[] {
  return collectHeadingsFromTokens(marked.lexer(content));
}

function applyHtmlTransforms(
  html: string,
  document: AkariMarkdownDocument,
  hooks: readonly AkariMarkdownHook[],
): string {
  const withBuiltIns = addHeadingSlugs(html);

  return hooks.reduce((currentHtml, hook) => {
    if (!hook.transformHtml) {
      return currentHtml;
    }

    return hook.transformHtml(currentHtml, document) ?? currentHtml;
  }, withBuiltIns);
}

function parseFrontmatterBlock(
  block: string,
): Readonly<Record<string, FrontmatterValue>> {
  const entries: [string, FrontmatterValue][] = [];

  for (const line of block.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    entries.push([key, coerceFrontmatterValue(rawValue)]);
  }

  return Object.freeze(Object.fromEntries(entries));
}

function coerceFrontmatterValue(raw: string): FrontmatterValue {
  const unquoted = raw.replace(/^['"]|['"]$/g, "");
  const lower = unquoted.toLowerCase();

  if (lower === "true") {
    return true;
  }

  if (lower === "false") {
    return false;
  }

  const asNumber = Number(unquoted);
  if (Number.isFinite(asNumber) && unquoted.length > 0) {
    return asNumber;
  }

  return unquoted;
}

function renderBasicMarkdown(content: string): {
  readonly html: string;
  readonly headings: readonly AkariMarkdownHeading[];
} {
  const tokens = marked.lexer(content);

  return {
    html: markedParser.parse(content) as string,
    headings: collectHeadingsFromTokens(tokens),
  };
}

function collectHeadingsFromTokens(
  tokens: TokensList,
): readonly AkariMarkdownHeading[] {
  const headings: AkariMarkdownHeading[] = [];

  for (const token of tokens) {
    if (token.type !== "heading") {
      continue;
    }

    const level = token.depth;
    const text = token.text.trim();
    const id = slugify(text);

    headings.push({ level, text, id });
  }

  return headings;
}

function addHeadingSlugs(html: string): string {
  return html.replace(
    /<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g,
    (
      _match,
      level: string,
      attributes: string | undefined,
      innerHtml: string,
    ) => {
      const existingAttributes = attributes ?? "";
      if (/\sid\s*=/.test(existingAttributes)) {
        return `<h${level}${existingAttributes}>${innerHtml}</h${level}>`;
      }

      const slug = slugify(stripHtml(innerHtml));
      const idAttribute = slug ? ` id="${slug}"` : "";
      return `<h${level}${existingAttributes}${idAttribute}>${innerHtml}</h${level}>`;
    },
  );
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function slugify(value: string): string {
  const signatureBase = value.replace(/\s*\([^)]*\)\s*$/, "");

  return signatureBase
    .replace(/&amp;/gi, " and ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_/]+/g, " ")
    .replace(/[():.,]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
