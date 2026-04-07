import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { FrontmatterValue, NavItem, TocItem } from "../theme/Layout.vue";

export interface DocsApiHeading {
  readonly level: number;
  readonly text: string;
  readonly id: string;
}

export interface DocsApiPageIndexItem {
  readonly slug: string;
  readonly href: string;
  readonly label: string;
  readonly headings?: readonly DocsApiHeading[];
  readonly metadata?: Readonly<Record<string, FrontmatterValue>>;
}

export interface DocsApiLoadedModule {
  readonly default: unknown;
  readonly metadata: Readonly<Record<string, FrontmatterValue>>;
  readonly headings: readonly DocsApiHeading[];
}

export interface CreateDocsApiOptions {
  readonly markdownModules: Record<string, () => Promise<DocsApiLoadedModule>>;
  readonly pageIndex: readonly DocsApiPageIndexItem[];
  readonly locale?: string;
}

export interface CreateDocsRuntimeOptions extends CreateDocsApiOptions {
  readonly initialSlug?: string;
}

export interface DocsApi {
  readonly getFallbackSlug: () => string;
  readonly resolveSlug: (slug: string) => string;
  readonly buildNavigatorItems: (
    currentSlug: string,
    locale?: string,
  ) => readonly NavItem[];
  readonly buildTocItems: (
    headings?: readonly DocsApiHeading[],
  ) => readonly TocItem[];
  readonly loadPage: (
    slug: string,
    locale?: string,
  ) => Promise<{ slug: string; module: DocsApiLoadedModule } | null>;
}

export interface DocsRuntime {
  readonly api: DocsApi;
  readonly currentSlug: Ref<string>;
  readonly currentModule: Ref<DocsApiLoadedModule | null>;
  readonly isLoading: Ref<boolean>;
  readonly locale: Ref<string>;
  readonly tocItems: ComputedRef<readonly TocItem[]>;
  readonly navigatorItems: ComputedRef<readonly NavItem[]>;
  readonly setLocale: (locale: string) => void;
  readonly loadPage: (slug?: string, locale?: string) => Promise<void>;
  readonly onPageChange: (
    slug: string,
    navigate?: (slug: string, locale: string) => Promise<unknown> | unknown,
  ) => Promise<void>;
}

const DEFAULT_LOCALE = "en";

function normalizeLocale(input?: string): string {
  return typeof input === "string" && input.trim().length > 0
    ? input.trim()
    : DEFAULT_LOCALE;
}

export function createDocsApi(options: CreateDocsApiOptions): DocsApi {
  const pageIndexBySlug = Object.fromEntries(
    options.pageIndex.map((item) => [item.slug, item]),
  ) as Record<string, DocsApiPageIndexItem>;

  const getFallbackSlug = (): string => {
    if (pageIndexBySlug.introduction) {
      return "introduction";
    }

    return options.pageIndex[0]?.slug ?? "";
  };

  const resolveSlug = (slug: string): string => {
    return pageIndexBySlug[slug] ? slug : getFallbackSlug();
  };

  const buildNavigatorItems = (
    currentSlug: string,
    locale = options.locale,
  ): readonly NavItem[] => {
    const normalizedLocale = normalizeLocale(locale);

    return options.pageIndex.map((item) => ({
      label: item.label,
      slug: item.slug,
      href: `/${normalizedLocale}/${item.slug}`,
      isActive: item.slug === currentSlug,
    }));
  };

  const buildTocItems = (
    headings: readonly DocsApiHeading[] = [],
  ): readonly TocItem[] => {
    return headings
      .filter((heading) => heading.level >= 2 && heading.level <= 3)
      .map((heading) => ({
        label: heading.text,
        href: `#${heading.id}`,
        level: heading.level,
      }));
  };

  const loadPage = async (slug: string, locale = options.locale) => {
    const normalizedLocale = normalizeLocale(locale);
    const targetSlug = resolveSlug(slug);
    if (!targetSlug) {
      return null;
    }

    const localizedPath = `./content/${targetSlug}.${normalizedLocale}.md`;
    const fallbackPath = `./content/${targetSlug}.md`;
    const loader =
      options.markdownModules[localizedPath] ??
      options.markdownModules[fallbackPath];
    if (!loader) {
      return null;
    }

    const module = await loader();
    return { slug: targetSlug, module };
  };

  return {
    getFallbackSlug,
    resolveSlug,
    buildNavigatorItems,
    buildTocItems,
    loadPage,
  };
}

export function createDocsRuntime(
  options: CreateDocsRuntimeOptions,
): DocsRuntime {
  const api = createDocsApi(options);
  const locale = ref(normalizeLocale(options.locale));
  const currentSlug = ref(api.resolveSlug(options.initialSlug ?? ""));
  const currentModule = ref<DocsApiLoadedModule | null>(null);
  const isLoading = ref(false);

  const setLocale = (value: string) => {
    locale.value = normalizeLocale(value);
  };

  const loadPage = async (
    slug = currentSlug.value,
    nextLocale = locale.value,
  ) => {
    isLoading.value = true;
    try {
      const result = await api.loadPage(slug, nextLocale);
      if (!result) {
        return;
      }

      currentSlug.value = result.slug;
      currentModule.value = result.module;
      locale.value = normalizeLocale(nextLocale);
    } finally {
      isLoading.value = false;
    }
  };

  const onPageChange = async (
    slug: string,
    navigate?: (slug: string, locale: string) => Promise<unknown> | unknown,
  ) => {
    if (!slug || slug === currentSlug.value) {
      return;
    }

    if (navigate) {
      await navigate(slug, locale.value);
      return;
    }

    await loadPage(slug, locale.value);
  };

  const tocItems = computed(() =>
    api.buildTocItems(currentModule.value?.headings),
  );
  const navigatorItems = computed(() =>
    api.buildNavigatorItems(currentSlug.value, locale.value),
  );

  return {
    api,
    currentSlug,
    currentModule,
    isLoading,
    locale,
    tocItems,
    navigatorItems,
    setLocale,
    loadPage,
    onPageChange,
  };
}
