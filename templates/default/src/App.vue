<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Layout,
  useLiteI18n,
  type FooterData,
  type FrontmatterValue,
  type LocaleCode,
} from "akari-docs/runtime";
import { markdownIndex } from "virtual:akari-md-index";
import { siteFooter } from "./config/site";

interface MarkdownHeading {
  readonly level: number;
  readonly text: string;
  readonly id: string;
}

interface FrontmatterData {
  readonly title?: string;
  readonly author?: string;
  readonly description?: string;
  readonly [key: string]: FrontmatterValue | undefined;
}

interface LoadedMarkdownModule {
  readonly default: unknown;
  readonly metadata: FrontmatterData;
  readonly headings: readonly MarkdownHeading[];
}

interface PageIndexItem {
  readonly slug: string;
  readonly href: string;
  readonly label: string;
  readonly headings: readonly MarkdownHeading[];
  readonly metadata: FrontmatterData;
}

const markdownModules = import.meta.glob<LoadedMarkdownModule>(
  "./content/*.md",
);
const LOCALIZED_SLUG_SUFFIX = /\.(en|th)$/;

const currentSlug = ref<string>("");
const currentModule = ref<LoadedMarkdownModule | null>(null);
const isLoading = ref(false);
const {
  ensureLocaleLoaded,
  getOptionalTranslatedFrontmatter,
  locale,
  setLocale,
  t,
} = useLiteI18n();

const pageIndex = computed<readonly PageIndexItem[]>(() => {
  return (markdownIndex as readonly PageIndexItem[]).filter(
    (item) => !LOCALIZED_SLUG_SUFFIX.test(item.slug),
  );
});

const pageIndexBySlug = computed<Record<string, PageIndexItem>>(() => {
  return Object.fromEntries(pageIndex.value.map((item) => [item.slug, item]));
});

const navigatorItems = computed(() =>
  pageIndex.value.map((item) => ({
    label:
      getOptionalTranslatedFrontmatter(item.metadata, "title") ?? item.label,
    slug: item.slug,
    href: `/${locale.value}/${item.slug}`,
    isActive: item.slug === currentSlug.value,
  })),
);

const tocItems = computed(() => {
  const headings = currentModule.value?.headings ?? [];
  return headings
    .filter((heading) => heading.level >= 2 && heading.level <= 3)
    .map((heading) => ({
      label: heading.text,
      href: `#${heading.id}`,
      level: heading.level,
    }));
});

const frontmatter = computed<FrontmatterData>(() => {
  const metadata =
    currentModule.value?.metadata ??
    pageIndexBySlug.value[currentSlug.value]?.metadata ??
    {};

  return {
    ...metadata,
    title:
      getOptionalTranslatedFrontmatter(metadata, "title") ?? metadata.title,
    description:
      getOptionalTranslatedFrontmatter(metadata, "description") ??
      metadata.description,
  };
});

const footerData = computed<FooterData>(() => {
  return {
    ...siteFooter,
    legalText: `Copyright ${new Date().getFullYear()} ${siteFooter.brand}. All rights reserved.`,
  };
});

async function loadPage(slug: string): Promise<void> {
  const fallback = pageIndexBySlug.value.introduction
    ? "introduction"
    : pageIndex.value[0]?.slug;
  const targetSlug = pageIndexBySlug.value[slug] ? slug : fallback;
  if (!targetSlug) {
    return;
  }

  const localizedPath = `./content/${targetSlug}.${locale.value}.md`;
  const fallbackPath = `./content/${targetSlug}.md`;
  const loader =
    markdownModules[localizedPath] ?? markdownModules[fallbackPath];
  if (!loader) {
    return;
  }

  isLoading.value = true;
  try {
    const loaded = await loader();
    currentModule.value = loaded;
    currentSlug.value = targetSlug;
    window.scrollTo({ top: 0, behavior: "instant" });
  } finally {
    isLoading.value = false;
  }
}

const route = useRoute();
const router = useRouter();

function handlePageChange(slug: string): void {
  if (!slug || slug === currentSlug.value) {
    return;
  }

  void router.push({ path: `/${locale.value}/${slug}` }).catch(() => {
    void loadPage(slug);
  });
}

function handleLocaleChange(nextLocale: LocaleCode): void {
  if (nextLocale === locale.value) {
    return;
  }

  void setLocale(nextLocale);
}

function normalizeRoute(path: string): {
  localeFromPath: LocaleCode | null;
  slug: string;
} {
  const [segmentA = "", segmentB = ""] = path.replace(/^\//, "").split("/");
  if (segmentA === "en" || segmentA === "th") {
    return { localeFromPath: segmentA, slug: segmentB };
  }

  return { localeFromPath: null, slug: segmentA };
}

function getFallbackSlug(): string {
  return pageIndexBySlug.value.introduction
    ? "introduction"
    : (pageIndex.value[0]?.slug ?? "");
}

async function syncLocaleRoute(path: string): Promise<void> {
  await ensureLocaleLoaded();

  const { localeFromPath, slug } = normalizeRoute(path);
  if (localeFromPath && localeFromPath !== locale.value) {
    await setLocale(localeFromPath);
  }

  const fallbackSlug = getFallbackSlug();
  const targetSlug = slug || fallbackSlug;
  if (!targetSlug) {
    return;
  }

  if (!localeFromPath) {
    await router
      .replace({ path: `/${locale.value}/${targetSlug}` })
      .catch(() => undefined);
    return;
  }

  await loadPage(targetSlug);
}

onMounted(() => {
  void syncLocaleRoute(route.path);
});

watch(
  () => route.path,
  (newPath) => {
    void syncLocaleRoute(newPath);
  },
);

watch(
  () => locale.value,
  (nextLocale) => {
    if (!currentSlug.value) {
      return;
    }

    const expectedPath = `/${nextLocale}/${currentSlug.value}`;
    if (route.path !== expectedPath) {
      void router.replace({ path: expectedPath });
    }
  },
);
</script>

<template>
  <Layout :frontmatter="frontmatter" :on-page-change="handlePageChange" :toc-items="tocItems"
    :on-locale-change="handleLocaleChange" :navigator-items="navigatorItems" :current-slug="currentSlug"
    :locale="locale" :footer="footerData">
    <transition name="fade" mode="out-in">
      <article v-if="currentModule && !isLoading" key="page"
        class="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-pre:border prose-pre:border-neutral-800 prose-pre:bg-neutral-900 prose-pre:rounded-2xl">
        <component :is="currentModule.default" />
      </article>

      <div v-else key="loading" class="flex min-h-[40vh] items-center justify-center bg-transparent text-neutral-100">
        <div class="text-center p-6">
          <p class="text-lg">{{ t("loading") }}</p>
        </div>
      </div>
    </transition>
  </Layout>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
