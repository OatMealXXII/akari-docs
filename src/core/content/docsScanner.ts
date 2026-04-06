import type { RouteSegment } from "../routing/types";

interface BunLikeFile {
  exists(): Promise<boolean>;
}

interface BunLikeGlob {
  scan(options: { cwd: string; absolute: true }): AsyncIterable<string>;
}

interface BunLikeRuntime {
  cwd(): string;
  file(path: string): BunLikeFile;
  Glob: new (pattern: string) => BunLikeGlob;
}

export interface ScanDocsOptions {
  readonly docsRoot?: string;
}

export interface ScannedDocFile {
  readonly id: string;
  readonly filePath: string;
  readonly relativePath: string;
  readonly routePath: string;
  readonly segments: readonly RouteSegment[];
  readonly isIndex: boolean;
}

export interface ScanDocsResult {
  readonly docsRoot: string;
  readonly generatedAt: string;
  readonly files: readonly ScannedDocFile[];
}

const MARKDOWN_PATTERN = "**/*.md";

export async function scanDocsForRouting(
  options: ScanDocsOptions = {},
): Promise<ScanDocsResult> {
  const runtime = getBunRuntime();
  const docsRoot = normalizeAbsolutePath(
    options.docsRoot ?? "docs",
    runtime.cwd(),
  );

  const rootExists = await runtime.file(docsRoot).exists();
  if (!rootExists) {
    return {
      docsRoot,
      generatedAt: new Date().toISOString(),
      files: [],
    };
  }

  const glob = new runtime.Glob(MARKDOWN_PATTERN);
  const files: string[] = [];

  for await (const filePath of glob.scan({ cwd: docsRoot, absolute: true })) {
    files.push(normalizeAbsolutePath(filePath, docsRoot));
  }

  const scannedFiles = files
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => toScannedDocFile(docsRoot, filePath));

  return {
    docsRoot,
    generatedAt: new Date().toISOString(),
    files: scannedFiles,
  };
}

function getBunRuntime(): BunLikeRuntime {
  const candidate = (globalThis as Record<string, unknown>).Bun;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Bun runtime not detected. Run scanner with Bun.");
  }

  const runtime = candidate as Partial<BunLikeRuntime>;
  if (
    typeof runtime.file !== "function" ||
    typeof runtime.Glob !== "function"
  ) {
    throw new Error(
      "Incomplete Bun runtime: expected Bun.file and Bun.Glob APIs.",
    );
  }

  return runtime as BunLikeRuntime;
}

function toScannedDocFile(docsRoot: string, filePath: string): ScannedDocFile {
  const relativePath = getRelativePath(docsRoot, filePath);
  const filePathNoExt = relativePath.slice(0, -3);
  const fileSegments = filePathNoExt.split("/").filter(Boolean);
  const isIndex = fileSegments[fileSegments.length - 1] === "index";
  const routeSegments = toRouteSegments(fileSegments, isIndex);

  return {
    id: createStableId(relativePath),
    filePath,
    relativePath,
    routePath: toRoutePath(routeSegments),
    segments: routeSegments,
    isIndex,
  };
}

function toRouteSegments(
  fileSegments: readonly string[],
  isIndex: boolean,
): RouteSegment[] {
  const coreSegments = isIndex ? fileSegments.slice(0, -1) : fileSegments;
  return coreSegments.map(toRouteSegment);
}

function toRouteSegment(rawSegment: string): RouteSegment {
  if (rawSegment.startsWith("[...") && rawSegment.endsWith("]")) {
    const value = rawSegment.slice(4, -1);
    assertSegmentValue(value, rawSegment);
    return { raw: rawSegment, kind: "catchall", value };
  }

  if (rawSegment.startsWith("[") && rawSegment.endsWith("]")) {
    const value = rawSegment.slice(1, -1);
    assertSegmentValue(value, rawSegment);
    return { raw: rawSegment, kind: "param", value };
  }

  return { raw: rawSegment, kind: "static", value: rawSegment };
}

function assertSegmentValue(value: string, raw: string): void {
  if (!value || value.includes("/")) {
    throw new Error(`Invalid dynamic segment: ${raw}`);
  }
}

function toRoutePath(segments: readonly RouteSegment[]): string {
  if (segments.length === 0) {
    return "/";
  }

  const pathSegments = segments.map((segment) => {
    if (segment.kind === "static") {
      return segment.value;
    }

    if (segment.kind === "param") {
      return `:${segment.value}`;
    }

    return `*${segment.value}`;
  });

  return `/${pathSegments.join("/")}`;
}

function createStableId(relativePath: string): string {
  return relativePath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeAbsolutePath(input: string, cwd: string): string {
  const normalizedInput = trimTrailingSlash(toPosixPath(input.trim()));
  if (isAbsolutePath(normalizedInput)) {
    return normalizedInput;
  }

  const normalizedCwd = trimTrailingSlash(toPosixPath(cwd));
  return trimTrailingSlash(`${normalizedCwd}/${normalizedInput}`);
}

function getRelativePath(root: string, absoluteFilePath: string): string {
  const normalizedRoot = trimTrailingSlash(toPosixPath(root));
  const normalizedFile = trimTrailingSlash(toPosixPath(absoluteFilePath));
  const withSeparator = `${normalizedRoot}/`;

  if (!normalizedFile.startsWith(withSeparator)) {
    throw new Error(`File is outside docs root: ${absoluteFilePath}`);
  }

  return normalizedFile.slice(withSeparator.length);
}

function toPosixPath(input: string): string {
  return input.replace(/\\/g, "/");
}

function trimTrailingSlash(value: string): string {
  if (value === "/") {
    return value;
  }

  return value.replace(/\/+$/g, "");
}

function isAbsolutePath(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:\//.test(value);
}
