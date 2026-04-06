interface BunLikeFile {
  text(): Promise<string>;
}

interface BunLikeRuntime {
  file(path: string): BunLikeFile;
}

export interface MarkdownDocument {
  readonly filePath: string;
  readonly frontmatter: Readonly<Record<string, string>>;
  readonly markdown: string;
}

export async function readMarkdownFile(
  filePath: string,
): Promise<MarkdownDocument> {
  assertMarkdownExtension(filePath);

  const runtime = getBunRuntime();
  const source = await runtime.file(filePath).text();
  const parsed = extractFrontmatter(source);

  return {
    filePath,
    frontmatter: parsed.frontmatter,
    markdown: parsed.markdown,
  };
}

function getBunRuntime(): BunLikeRuntime {
  const candidate = (globalThis as Record<string, unknown>).Bun;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Bun runtime not detected. Run this with Bun.");
  }

  const runtime = candidate as Partial<BunLikeRuntime>;
  if (typeof runtime.file !== "function") {
    throw new Error("Incomplete Bun runtime: expected Bun.file API.");
  }

  return runtime as BunLikeRuntime;
}

function assertMarkdownExtension(filePath: string): void {
  if (!filePath.toLowerCase().endsWith(".md")) {
    throw new Error(`Expected a .md file, received: ${filePath}`);
  }
}

function extractFrontmatter(source: string): {
  frontmatter: Readonly<Record<string, string>>;
  markdown: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {
      frontmatter: {},
      markdown: source,
    };
  }

  const frontmatterBlock = match[1] ?? "";
  const frontmatter = parseFrontmatter(frontmatterBlock);

  return {
    frontmatter,
    markdown: source.slice(match[0].length),
  };
}

function parseFrontmatter(block: string): Readonly<Record<string, string>> {
  const entries: [string, string][] = [];
  const lines = block.split(/\r?\n/);

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['\"]|['\"]$/g, "");

    if (key.length > 0) {
      entries.push([key, value]);
    }
  }

  return Object.freeze(Object.fromEntries(entries));
}
