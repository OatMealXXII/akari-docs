<script setup lang="ts">
import { computed } from "vue";
import DOMPurify from "dompurify";

export interface RenderedMarkdownProps {
    readonly html: string;
    readonly tag?: "article" | "section" | "div" | "main";
    readonly sanitize?: boolean;
    readonly transformHtml?: (html: string) => string;
}

const props = withDefaults(defineProps<RenderedMarkdownProps>(), {
    tag: "article",
    sanitize: true,
});

const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
    });
};

const renderedHtml = computed<string>(() => {
    const sourceHtml = props.transformHtml ? props.transformHtml(props.html) : props.html;
    return props.sanitize ? sanitizeHtml(sourceHtml) : sourceHtml;
});
</script>

<template>
    <component :is="tag" class="akari-rendered-markdown" v-html="renderedHtml" />
</template>
