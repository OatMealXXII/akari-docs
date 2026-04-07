<script setup lang="ts">
import { onMounted } from "vue";
import { Layout, createDocsRuntime } from "akari-docs";
import { markdownIndex } from "virtual:akari-md-index";

interface MarkdownHeading {
    readonly level: number;
    readonly text: string;
    readonly id: string;
}

interface LoadedMarkdownModule {
    readonly default: unknown;
    readonly metadata: Record<string, string | number | boolean>;
    readonly headings: readonly MarkdownHeading[];
}

const markdownModules = import.meta.glob<LoadedMarkdownModule>("./content/*.md");

const docs = createDocsRuntime({
    markdownModules,
    pageIndex: markdownIndex,
    locale: "en",
    initialSlug: "introduction",
});

const { currentModule, currentSlug, tocItems, navigatorItems } = docs;

function handlePageChange(slug: string): void {
    void docs.onPageChange(slug);
}

onMounted(() => {
    void docs.loadPage();
});
</script>

<template>
    <Layout :frontmatter="currentModule?.metadata" :toc-items="tocItems" :navigator-items="navigatorItems"
        :current-slug="currentSlug" :on-page-change="handlePageChange">
        <component :is="currentModule?.default" v-if="currentModule" />
    </Layout>
</template>
