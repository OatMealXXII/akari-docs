<template>
    <div class="app-layout" style="display: flex; height: 100vh">
        <aside style="
        width: 260px;
        border-right: 1px solid var(--border, #e6e6e6);
        padding: 1rem;
        overflow: auto;
      ">
            <nav>
                <ul style="list-style: none; padding: 0; margin: 0">
                    <li v-for="item in navigatorItems" :key="item.slug || item.href" style="margin-bottom: 0.5rem">
                        <a :href="item.href" @click.prevent="change(item.slug)" :style="{
                            fontWeight: item.isActive ? '600' : '400',
                            color: item.isActive ? 'var(--accent,#111)' : 'inherit',
                        }">
                            {{ item.label }}
                        </a>
                    </li>
                </ul>
            </nav>

            <hr />

            <div v-if="tocItems && tocItems.length" style="margin-top: 0.75rem">
                <strong>Contents</strong>
                <ul style="list-style: none; padding: 0; margin: 0; margin-top: 0.5rem">
                    <li v-for="t in tocItems" :key="t.href"
                        :style="{ marginLeft: ((t.level ?? 2) - 2) * 10 + 'px', marginBottom: '0.25rem' }">
                        <a :href="t.href">{{ t.label }}</a>
                    </li>
                </ul>
            </div>
        </aside>

        <main style="flex: 1; padding: 1rem; overflow: auto">
            <slot />
        </main>
    </div>
</template>

<script setup lang="ts">
export interface LocalLayoutNavItem {
    readonly label: string;
    readonly href: string;
    readonly slug?: string;
    readonly isActive?: boolean;
}

export interface LocalLayoutTocItem {
    readonly label: string;
    readonly href: string;
    readonly level?: number;
}

export interface LocalLayoutProps {
    readonly frontmatter?: Readonly<Record<string, unknown>>;
    readonly tocItems?: readonly LocalLayoutTocItem[];
    readonly navigatorItems?: readonly LocalLayoutNavItem[];
    readonly currentSlug?: string;
    readonly onPageChange?: (slug: string) => void;
}

const props = defineProps<LocalLayoutProps>();

function change(slug?: string) {
    if (!slug) {
        return;
    }

    props.onPageChange?.(slug);
}
</script>
