import type {
	BuildRouteManifestOptions,
	DocRoute,
	RouteKind,
	RouteManifest,
	RouteMeta,
	RouteSegment,
} from "./types";

interface BunLikeFile {
	exists(): Promise<boolean>;
	text(): Promise<string>;
}

interface BunLikeGlob {
	scan(options: { cwd: string; absolute: true }): AsyncIterable<string>;
}

interface BunLikeRuntime {
	cwd(): string;
	file(path: string): BunLikeFile;
	Glob: new (pattern: string) => BunLikeGlob;
}

const EXTENSIONS = [".md", ".mdx"] as const;
const FRONTMATTER_START = "---";

export async function buildRouteManifest(
	options: BuildRouteManifestOptions,
): Promise<RouteManifest> {
	const runtime = getBunRuntime();
	const contentRoot = normalizeAbsolutePath(options.contentRoot, runtime.cwd());

	const exists = await runtime.file(contentRoot).exists();
	if (!exists) {
		throw new Error(`Content root does not exist: ${contentRoot}`);
	}

	const files = await scanContentFiles(
		runtime,
		contentRoot,
		options.includeMdx ?? true,
	);
	const routes = await Promise.all(
		files.map((filePath) => toDocRoute(runtime, contentRoot, filePath)),
	);

	return {
		contentRoot,
		generatedAt: new Date().toISOString(),
		routes: [...routes].sort(compareRoutes),
	};
}

function getBunRuntime(): BunLikeRuntime {
	const candidate = (globalThis as Record<string, unknown>).Bun;
	if (!candidate || typeof candidate !== "object") {
		throw new Error(
			"Bun runtime not detected. Run this route builder with Bun.",
		);
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

async function scanContentFiles(
	runtime: BunLikeRuntime,
	contentRoot: string,
	includeMdx: boolean,
): Promise<string[]> {
	const files = new Set<string>();

	const mdGlob = new runtime.Glob("**/*.md");
	for await (const filePath of mdGlob.scan({
		cwd: contentRoot,
		absolute: true,
	})) {
		files.add(normalizeAbsolutePath(filePath, contentRoot));
	}

	if (includeMdx) {
		const mdxGlob = new runtime.Glob("**/*.mdx");
		for await (const filePath of mdxGlob.scan({
			cwd: contentRoot,
			absolute: true,
		})) {
			files.add(normalizeAbsolutePath(filePath, contentRoot));
		}
	}

	return [...files];
}

async function toDocRoute(
	runtime: BunLikeRuntime,
	contentRoot: string,
	filePath: string,
): Promise<DocRoute> {
	const relativePath = getRelativePath(contentRoot, filePath);
	const extension = getExtension(relativePath);
	if (!isAllowedExtension(extension)) {
		throw new Error(`Unsupported file extension: ${extension}`);
	}

	const filePathNoExt = relativePath.slice(0, -extension.length);
	const fileSegments = filePathNoExt.split("/").filter(Boolean);
	const isIndex = fileSegments[fileSegments.length - 1] === "index";
	const routeSegments = toRouteSegments(fileSegments, isIndex);
	const routePath = toRoutePath(routeSegments);

	const content = await runtime.file(filePath).text();
	const meta = parseFrontmatterMeta(content);

	return {
		id: createStableId(relativePath),
		filePath,
		relativePath,
		routePath,
		segments: routeSegments,
		isIndex,
		meta,
	};
}

function toRouteSegments(
	fileSegments: string[],
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

function parseFrontmatterMeta(content: string): RouteMeta {
	const trimmed = content.trimStart();
	if (!trimmed.startsWith(FRONTMATTER_START)) {
		return {};
	}

	const lines = trimmed.split(/\r?\n/);
	if (lines.length < 3 || lines[0] !== FRONTMATTER_START) {
		return {};
	}

	const closingIndex = lines
		.slice(1)
		.findIndex((line) => line === FRONTMATTER_START);
	if (closingIndex < 0) {
		return {};
	}

	const metaLines = lines.slice(1, closingIndex + 1);
	const rawMeta = new Map<string, string>();
	for (const line of metaLines) {
		const separatorIndex = line.indexOf(":");
		if (separatorIndex <= 0) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line
			.slice(separatorIndex + 1)
			.trim()
			.replace(/^['\"]|['\"]$/g, "");
		if (key) {
			rawMeta.set(key, value);
		}
	}

	const orderRaw = rawMeta.get("order");
	const order = orderRaw !== undefined ? Number(orderRaw) : undefined;

	return {
		title: rawMeta.get("title") || undefined,
		description: rawMeta.get("description") || undefined,
		order: Number.isFinite(order) ? order : undefined,
	};
}

function compareRoutes(a: DocRoute, b: DocRoute): number {
	if (a.routePath === b.routePath) {
		return a.relativePath.localeCompare(b.relativePath);
	}

	const byOrder =
		(a.meta.order ?? Number.MAX_SAFE_INTEGER) -
		(b.meta.order ?? Number.MAX_SAFE_INTEGER);
	if (byOrder !== 0) {
		return byOrder;
	}

	const bySpecificity = scoreRoute(a) - scoreRoute(b);
	if (bySpecificity !== 0) {
		return bySpecificity;
	}

	return a.routePath.localeCompare(b.routePath);
}

function scoreRoute(route: DocRoute): number {
	return route.segments.reduce((score, segment) => {
		const kindWeight: Record<RouteKind, number> = {
			static: 0,
			param: 10,
			catchall: 100,
		};

		return score + kindWeight[segment.kind];
	}, 0);
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

function toPosixPath(input: string): string {
	return input.replace(/\\/g, "/");
}

function getRelativePath(root: string, absoluteFilePath: string): string {
	const normalizedRoot = trimTrailingSlash(toPosixPath(root));
	const normalizedFile = trimTrailingSlash(toPosixPath(absoluteFilePath));
	const withSeparator = `${normalizedRoot}/`;

	if (!normalizedFile.startsWith(withSeparator)) {
		throw new Error(`File is outside content root: ${absoluteFilePath}`);
	}

	return normalizedFile.slice(withSeparator.length);
}

function getExtension(relativePath: string): string {
	const slashIndex = relativePath.lastIndexOf("/");
	const dotIndex = relativePath.lastIndexOf(".");
	if (dotIndex <= slashIndex) {
		return "";
	}

	return relativePath.slice(dotIndex);
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

function isAllowedExtension(extension: string): boolean {
	return EXTENSIONS.includes(extension as (typeof EXTENSIONS)[number]);
}
