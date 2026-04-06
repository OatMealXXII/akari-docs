<script setup lang="ts">
import { computed } from "vue";

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

const renderedHtml = computed<string>(() => {
    const sourceHtml = props.transformHtml ? props.transformHtml(props.html) : props.html;
    return props.sanitize ? sanitizeHtml(sourceHtml) : sourceHtml;
});

function sanitizeHtml(input: string): string {
    let output = input;

    // Remove dangerous container tags and their content blocks.
    output = output.replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");

    // Strip standalone dangerous tags.
    output = output.replace(/<\s*(link|meta)[^>]*>/gi, "");

    // Remove inline event handlers like onclick=... and onload=...
    output = output.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

    // Neutralize javascript: URLs in href/src attributes.
    output = output.replace(
        /\s+(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi,
        "",
    );

    return output;
}
</script>

<template>
    <component :is="tag" class="akari-rendered-markdown" v-html="renderedHtml" />
</template>
