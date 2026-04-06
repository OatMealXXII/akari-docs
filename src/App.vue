<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Layout from "./theme/Layout.vue";
import type { FooterData, FrontmatterValue } from "./theme/Layout.vue";
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

const markdownModules = import.meta.glob<LoadedMarkdownModule>("./content/*.md");

const currentSlug = ref<string>("");
const currentModule = ref<LoadedMarkdownModule | null>(null);
const isLoading = ref(false);

const pageIndex = computed<readonly PageIndexItem[]>(() => markdownIndex as readonly PageIndexItem[]);

const pageIndexBySlug = computed<Record<string, PageIndexItem>>(() => {
  return Object.fromEntries(pageIndex.value.map((item) => [item.slug, item]));
});

const navigatorItems = computed(() =>
  pageIndex.value.map((item) => ({
    label: item.label,
    slug: item.slug,
    href: item.href,
    isActive: item.slug === currentSlug.value,
  })),
);

const tocItems = computed(() => {
  const current = pageIndexBySlug.value[currentSlug.value];
  const headings = current?.headings ?? [];
  return headings
    .filter((heading) => heading.level >= 2 && heading.level <= 3)
    .map((heading) => ({
      label: heading.text,
      href: `#${heading.id}`,
      level: heading.level,
    }));
});

const frontmatter = computed<FrontmatterData>(() => {
  return currentModule.value?.metadata ?? pageIndexBySlug.value[currentSlug.value]?.metadata ?? {};
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

  const modulePath = `./content/${targetSlug}.md`;
  const loader = markdownModules[modulePath];
  if (!loader) {
    return;
  }

  isLoading.value = true;
  try {
    const loaded = await loader();
    currentModule.value = loaded;
    currentSlug.value = targetSlug;
    // Do not manipulate history directly when using vue-router; router navigation
    // will drive URL changes. Keep scroll reset here.
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

  void router.push({ path: `/${slug}` }).catch(() => {
    void loadPage(slug);
  });
}

onMounted(() => {
  const path = route.path.replace(/^\//, "").split("/")[0] ?? "";
  const fallback = pageIndexBySlug.value.introduction
    ? "introduction"
    : pageIndex.value[0]?.slug ?? "";
  void loadPage(path || fallback);
});

watch(
  () => route.path,
  (newPath) => {
    const slug = newPath.replace(/^\//, "").split("/")[0] ?? "";
    const fallback = pageIndexBySlug.value.introduction
      ? "introduction"
      : pageIndex.value[0]?.slug ?? "";
    void loadPage(slug || fallback);
  }
);

</script>

<template>
  <Layout :frontmatter="frontmatter" :on-page-change="handlePageChange" :toc-items="tocItems"
    :navigator-items="navigatorItems" :current-slug="currentSlug" :footer="footerData">
    <transition name="fade" mode="out-in">
      <article v-if="currentModule && !isLoading" key="page"
        class="prose prose-invert max-w-none prose-green prose-headings:scroll-mt-24 prose-pre:border prose-pre:border-neutral-800 prose-pre:bg-neutral-900 prose-pre:rounded-2xl">
        <component :is="currentModule.default" />
      </article>

      <div v-else key="loading" class="flex min-h-[40vh] items-center justify-center bg-transparent text-neutral-100">
        <div class="text-center p-6">
          <p class="text-lg">Loading...</p>
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