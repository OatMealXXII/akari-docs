export interface TocHrefItem {
  readonly href: string;
}

export interface HeadingIdentity {
  readonly id: string;
}

export interface HeadingPosition extends HeadingIdentity {
  readonly top: number;
  readonly isConnected?: boolean;
}

export const DEFAULT_HEADING_SCROLL_OFFSET = 100;

export function normalizeHeadingId(value: string): string {
  const trimmed = value.trim().replace(/^#/, "").trim();
  if (!trimmed) {
    return "";
  }

  try {
    return decodeURIComponent(trimmed).toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function buildTocHrefById(
  tocItems: readonly TocHrefItem[],
): Map<string, string> {
  const map = new Map<string, string>();

  tocItems.forEach((item) => {
    const href = String(item.href ?? "");
    const normalized = normalizeHeadingId(href);
    if (normalized) {
      map.set(normalized, href);
    }
  });

  return map;
}

export function toActiveHref(
  rawId: string,
  tocHrefById: ReadonlyMap<string, string>,
): string | null {
  const normalized = normalizeHeadingId(rawId);
  if (!normalized) {
    return null;
  }

  return tocHrefById.get(normalized) ?? `#${rawId.replace(/^#/, "")}`;
}

export function pickMonitorHeadings<T extends HeadingIdentity>(
  headings: readonly T[],
  tocHrefById: ReadonlyMap<string, string>,
): readonly T[] {
  const headingsWithIds = headings.filter(
    (heading) => normalizeHeadingId(heading.id).length > 0,
  );

  if (headingsWithIds.length === 0) {
    return [];
  }

  if (tocHrefById.size === 0) {
    return headingsWithIds;
  }

  const tocIds = new Set(tocHrefById.keys());
  const matched = headingsWithIds.filter((heading) =>
    tocIds.has(normalizeHeadingId(heading.id)),
  );

  // If TOC is present, we require strict matches to avoid binding stale headings.
  return matched.length > 0 ? matched : [];
}

export function resolveActiveHeadingByScroll(
  headings: readonly HeadingPosition[],
  tocHrefById: ReadonlyMap<string, string>,
  scrollY: number,
  offset = DEFAULT_HEADING_SCROLL_OFFSET,
): string | null {
  const connected = headings.filter(
    (heading) =>
      heading.isConnected !== false &&
      normalizeHeadingId(heading.id).length > 0,
  );

  if (connected.length === 0) {
    return null;
  }

  const threshold = scrollY + offset;
  for (let i = connected.length - 1; i >= 0; i -= 1) {
    const heading = connected[i];
    if (heading.top <= threshold) {
      return toActiveHref(heading.id, tocHrefById);
    }
  }

  return toActiveHref(connected[0].id, tocHrefById);
}
