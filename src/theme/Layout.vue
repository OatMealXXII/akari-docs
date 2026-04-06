<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from "vue";
import type { Component } from "vue";
import { BookText, ExternalLink, Github, Home, Link as LinkIcon } from "lucide-vue-next";
import {
    DEFAULT_HEADING_SCROLL_OFFSET,
    buildTocHrefById,
    normalizeHeadingId,
    pickMonitorHeadings,
    resolveActiveHeadingByScroll,
    toActiveHref,
} from "./toc-highlight";

export type FrontmatterValue = string | number | boolean;

export interface FrontmatterData {
    readonly title?: string;
    readonly [key: string]: FrontmatterValue | undefined;
}

export interface NavItem {
    readonly label: string;
    readonly href: string;
    readonly slug?: string;
    readonly isActive?: boolean;
}

export interface TocItem {
    readonly label: string;
    readonly href: string;
    readonly level?: number;
}

export interface FooterLink {
    readonly label: string;
    readonly href: string;
    readonly external?: boolean;
    readonly icon?: FooterIconName | (string & {});
}

export type FooterIconName = "docs" | "github" | "home" | "external" | "link";

export interface FooterData {
    readonly brand: string;
    readonly description?: string;
    readonly legalText?: string;
    readonly links?: readonly FooterLink[];
}

export interface LayoutProps {
    readonly frontmatter?: FrontmatterData;
    readonly onPageChange?: (slug: string) => void;
    readonly tocItems?: readonly TocItem[];
    readonly navigatorItems?: readonly NavItem[];
    readonly currentSlug?: string;
    readonly footer?: FooterData;
}

const props = defineProps<LayoutProps>();

const leftSidebarOpen = ref(true);
const rightSidebarOpen = ref(true);

// Manage delayed overflow switching to avoid flicker during transition
const leftOverflowEnabled = ref(leftSidebarOpen.value);
const rightOverflowEnabled = ref(rightSidebarOpen.value);
let leftOverflowTimer: ReturnType<typeof setTimeout> | null = null;
let rightOverflowTimer: ReturnType<typeof setTimeout> | null = null;
const OVERFLOW_DELAY = 300; // ms - should match transform duration

watch([leftSidebarOpen, rightSidebarOpen], () => {
    markHeadingOffsetsDirty();
    queueHeadingScrollSync();
});

watch(leftSidebarOpen, (open) => {
    if (!open) {
        if (leftOverflowTimer) {
            clearTimeout(leftOverflowTimer);
            leftOverflowTimer = null;
        }
        leftOverflowEnabled.value = false;
    } else {
        if (leftOverflowTimer) {
            clearTimeout(leftOverflowTimer);
        }
        leftOverflowTimer = setTimeout(() => {
            leftOverflowEnabled.value = true;
            leftOverflowTimer = null;
        }, OVERFLOW_DELAY);
    }
});

watch(rightSidebarOpen, (open) => {
    if (!open) {
        if (rightOverflowTimer) {
            clearTimeout(rightOverflowTimer);
            rightOverflowTimer = null;
        }
        rightOverflowEnabled.value = false;
    } else {
        if (rightOverflowTimer) {
            clearTimeout(rightOverflowTimer);
        }
        rightOverflowTimer = setTimeout(() => {
            rightOverflowEnabled.value = true;
            rightOverflowTimer = null;
        }, OVERFLOW_DELAY);
    }
});

onBeforeUnmount(() => {
    if (leftOverflowTimer) clearTimeout(leftOverflowTimer);
    if (rightOverflowTimer) clearTimeout(rightOverflowTimer);
    cleanupHeadingTracking();
});

// Active heading tracking for TOC highlighting
const activeHeadingId = ref<string | null>(null);
let headingObserver: IntersectionObserver | null = null;
let headingMutationObserver: MutationObserver | null = null;
let headingInitTimer: ReturnType<typeof setTimeout> | null = null;
let headingScrollRaf: number | null = null;
let headingScrollBound = false;
let trackedHeadings: HTMLElement[] = [];
let trackedHeadingScrollSnapshot: Array<{ id: string; top: number; isConnected: boolean }> = [];
let trackedTocHrefById = new Map<string, string>();
let trackedLayoutHeight = 0;
let headingOffsetsDirty = true;
const supportsDom = typeof window !== "undefined" && typeof document !== "undefined";
const HEADING_SCROLL_OFFSET = DEFAULT_HEADING_SCROLL_OFFSET;

const markHeadingOffsetsDirty = () => {
    headingOffsetsDirty = true;
};

const refreshHeadingScrollSnapshot = () => {
    if (!supportsDom) {
        trackedHeadingScrollSnapshot = [];
        headingOffsetsDirty = false;
        return;
    }

    const connectedHeadings = trackedHeadings.filter(
        (heading) => heading.isConnected && normalizeHeadingId(heading.id).length > 0,
    );

    if (connectedHeadings.length !== trackedHeadings.length) {
        trackedHeadings = connectedHeadings;
    }

    trackedHeadingScrollSnapshot = connectedHeadings.map((heading) => ({
        id: heading.id,
        top: heading.getBoundingClientRect().top + window.scrollY,
        isConnected: heading.isConnected,
    }));

    trackedLayoutHeight = document.documentElement.scrollHeight;
    headingOffsetsDirty = false;
};

const requestFrame = (callback: FrameRequestCallback): number => {
    if (!supportsDom) {
        return -1;
    }

    if (typeof window.requestAnimationFrame === "function") {
        return window.requestAnimationFrame(callback);
    }

    return window.setTimeout(() => {
        callback(performance.now());
    }, 16);
};

const cancelFrame = (id: number) => {
    if (!supportsDom || id < 0) {
        return;
    }

    if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(id);
        return;
    }

    window.clearTimeout(id);
};

const syncActiveHeadingByScroll = () => {
    if (!supportsDom) {
        activeHeadingId.value = null;
        return;
    }

    if (trackedHeadings.length === 0) {
        activeHeadingId.value = null;
        return;
    }

    const currentLayoutHeight = document.documentElement.scrollHeight;
    if (headingOffsetsDirty || currentLayoutHeight !== trackedLayoutHeight) {
        refreshHeadingScrollSnapshot();
    }

    if (trackedHeadingScrollSnapshot.length === 0) {
        activeHeadingId.value = null;
        return;
    }

    activeHeadingId.value = resolveActiveHeadingByScroll(
        trackedHeadingScrollSnapshot,
        trackedTocHrefById,
        window.scrollY,
        HEADING_SCROLL_OFFSET,
    );
};

const queueHeadingScrollSync = () => {
    if (!supportsDom) return;
    if (headingScrollRaf !== null) return;

    headingScrollRaf = requestFrame(() => {
        headingScrollRaf = null;
        syncActiveHeadingByScroll();
    });
};

const handleHeadingResize = () => {
    markHeadingOffsetsDirty();
    queueHeadingScrollSync();
};

const bindHeadingScrollTracking = () => {
    if (!supportsDom) return;
    if (headingScrollBound) return;

    window.addEventListener("scroll", queueHeadingScrollSync, { passive: true });
    window.addEventListener("resize", handleHeadingResize);
    headingScrollBound = true;
};

const unbindHeadingScrollTracking = () => {
    if (!supportsDom) return;
    if (!headingScrollBound) return;

    window.removeEventListener("scroll", queueHeadingScrollSync);
    window.removeEventListener("resize", handleHeadingResize);
    headingScrollBound = false;
};

const cleanupHeadingTracking = () => {
    if (headingObserver) {
        headingObserver.disconnect();
        headingObserver = null;
    }
    if (headingMutationObserver) {
        headingMutationObserver.disconnect();
        headingMutationObserver = null;
    }
    if (headingInitTimer) {
        clearTimeout(headingInitTimer);
        headingInitTimer = null;
    }
    if (headingScrollRaf !== null) {
        cancelFrame(headingScrollRaf);
        headingScrollRaf = null;
    }
    unbindHeadingScrollTracking();
    trackedHeadings = [];
    trackedHeadingScrollSnapshot = [];
    trackedTocHrefById = new Map<string, string>();
    trackedLayoutHeight = 0;
    headingOffsetsDirty = true;
};

// Setup a re-usable initializer for the heading IntersectionObserver so it
// can be re-created when the page content changes (SPA route change).
const initHeadingObserver = () => {
    if (!supportsDom) return;

    // Clean up any existing observer first to avoid duplicates / leaks
    cleanupHeadingTracking();

    activeHeadingId.value = null;
    const content = document.getElementById("content");
    if (!content) return;

    const getHeadings = () => Array.from(content.querySelectorAll("h2, h3")) as HTMLElement[];

    const attemptInit = (headingsArr?: HTMLElement[]) => {
        const headings = headingsArr ?? getHeadings();
        if (!headings || headings.length === 0) return false;

        const tocHrefById = buildTocHrefById(props.tocItems ?? []);

        const monitorList = pickMonitorHeadings(headings, tocHrefById);
        if (monitorList.length === 0) {
            return false;
        }

        const rootMargin = "-100px 0px -80% 0px";
        const threshold = 0;

        if (typeof window.IntersectionObserver === "function") {
            const visibleMap = new Map<HTMLElement, IntersectionObserverEntry>();

            headingObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement;
                    if (!el.id) return;
                    if (entry.isIntersecting) {
                        visibleMap.set(el, entry);
                    } else {
                        visibleMap.delete(el);
                    }
                });

                if (visibleMap.size > 0) {
                    const vals = Array.from(visibleMap.values());
                    vals.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                    const topEntry = vals[0];
                    const id = (topEntry.target as HTMLElement).id;
                    activeHeadingId.value = id ? toActiveHref(id, tocHrefById) : null;
                    return;
                }

                refreshHeadingScrollSnapshot();
                activeHeadingId.value = resolveActiveHeadingByScroll(
                    trackedHeadingScrollSnapshot,
                    tocHrefById,
                    window.scrollY,
                    HEADING_SCROLL_OFFSET,
                );
            }, { root: null, rootMargin, threshold });

            monitorList.forEach((heading) => {
                const id = normalizeHeadingId(heading.id);
                if (!id) return;
                headingObserver?.observe(heading);
            });
        }

        trackedHeadings = [...monitorList];
        trackedTocHrefById = tocHrefById;
        markHeadingOffsetsDirty();
        bindHeadingScrollTracking();
        queueHeadingScrollSync();
        return true;
    };

    // Try immediately first (fast path)
    if (attemptInit()) return;

    let retryCount = 0;
    const MAX_RETRY_COUNT = 20;
    const scheduleRetry = () => {
        if (headingInitTimer || retryCount >= MAX_RETRY_COUNT) return;

        headingInitTimer = setTimeout(() => {
            headingInitTimer = null;
            retryCount += 1;

            if (attemptInit()) {
                headingMutationObserver?.disconnect();
                headingMutationObserver = null;
                return;
            }

            scheduleRetry();
        }, 100);
    };

    // If no headings yet (markdown may still be loading), set up a MutationObserver
    headingMutationObserver = new MutationObserver(() => {
        const hs = getHeadings();
        if (hs.length > 0 && attemptInit(hs)) {
            headingMutationObserver?.disconnect();
            headingMutationObserver = null;
            if (headingInitTimer) {
                clearTimeout(headingInitTimer);
                headingInitTimer = null;
            }
        }
    });
    headingMutationObserver.observe(content, { childList: true, subtree: true });

    // Also schedule repeated short retries while markdown content is still mounting.
    scheduleRetry();
};

// Re-create the observer whenever the current slug / route changes. Use
// nextTick() to wait until the new markdown content has been rendered into
// the DOM before querying for headings.
const tocSignature = computed(() => (props.tocItems ?? []).map((item) => String(item.href ?? "")).join("|"));

watch(
    [
        () => props.currentSlug,
        () => tocSignature.value,
    ],
    async () => {
        cleanupHeadingTracking();
        await nextTick();
        initHeadingObserver();
    },
    { immediate: true },
);

const desktopGridClass = computed(() => {
    if (leftSidebarOpen.value && rightSidebarOpen.value) {
        return "md:grid-cols-[17rem_minmax(0,1fr)_17rem]";
    }

    if (leftSidebarOpen.value && !rightSidebarOpen.value) {
        return "md:grid-cols-[17rem_minmax(0,1fr)_2.75rem]";
    }

    if (!leftSidebarOpen.value && rightSidebarOpen.value) {
        return "md:grid-cols-[2.75rem_minmax(0,1fr)_17rem]";
    }

    return "md:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]";
});

// Keep text hidden while opening so users do not see squeezed labels.
const leftSidebarPanelClass = computed(() => {
    if (!leftSidebarOpen.value) {
        return "opacity-0 -translate-x-2 pointer-events-none transition-transform duration-300 transition-opacity duration-75";
    }

    if (!leftOverflowEnabled.value) {
        return "opacity-0 translate-x-0 pointer-events-none transition-transform duration-300 transition-opacity duration-120";
    }

    return "opacity-100 translate-x-0 pointer-events-auto transition-transform duration-300 transition-opacity duration-120";
});

const rightSidebarPanelClass = computed(() => {
    if (!rightSidebarOpen.value) {
        return "opacity-0 translate-x-2 pointer-events-none transition-transform duration-300 transition-opacity duration-75";
    }

    if (!rightOverflowEnabled.value) {
        return "opacity-0 translate-x-0 pointer-events-none transition-transform duration-300 transition-opacity duration-120";
    }

    return "opacity-100 translate-x-0 pointer-events-auto transition-transform duration-300 transition-opacity duration-120";
});

const tocEntries = computed(() => props.tocItems ?? []);
const navigatorEntries = computed(() => props.navigatorItems ?? []);
const footerData = computed(() => props.footer ?? null);
const footerLinks = computed(() => footerData.value?.links ?? []);

const footerIconMap: Record<FooterIconName, Component> = {
    docs: BookText,
    github: Github,
    home: Home,
    external: ExternalLink,
    link: LinkIcon,
};

const resolveFooterIcon = (iconName?: string): Component => {
    if (!iconName) return LinkIcon;
    const normalized = iconName.toLowerCase() as FooterIconName;
    return footerIconMap[normalized] ?? LinkIcon;
};

const defaultNavigatorSlug = computed(() => {
    return navigatorEntries.value[0]?.slug ?? "";
});

const handlePageChange = (slug: string) => {
    if (!slug || slug === props.currentSlug) return;
    if (!props.onPageChange) return;

    props.onPageChange(slug);
};

const safeFrontmatter = computed<FrontmatterData>(() => {
    return props.frontmatter ?? {};
});

const safeAuthor = computed(() => {
    const author = safeFrontmatter.value.author;
    return typeof author === "string" && author.trim().length > 0 ? author : "Unknown";
});

const safeDescription = computed(() => {
    const description = safeFrontmatter.value.description;
    return typeof description === "string" && description.trim().length > 0 ? description : "-";
});

const safeTitle = computed(() => {
    const title = safeFrontmatter.value.title;
    return typeof title === "string" && title.trim().length > 0 ? title : "Akari Docs";
});

// Smooth scroll to heading and update URL hash without jumping
const scrollToHeading = (href: string) => {
    if (!supportsDom) return;

    const id = href.startsWith("#") ? href.slice(1) : href;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADING_SCROLL_OFFSET;
    activeHeadingId.value = toActiveHref(id, trackedTocHrefById) ?? `#${id}`;
    window.scrollTo({ top, behavior: "smooth" });
    try {
        history.replaceState(null, "", `#${id}`);
    } catch (e) {
        // ignore
    }
};

const tocLabelClass = (level?: number): string => {
    if (level === 2) {
        return "pl-1 text-neutral-100";
    }

    if (level === 3) {
        return "pl-4 text-neutral-300";
    }

    if (level && level >= 4) {
        return "pl-7 text-neutral-400";
    }

    return "text-neutral-200";
};
</script>

<template>
    <div class="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
        <div class="grid flex-1 min-h-0 grid-cols-1 items-start transition-[grid-template-columns] duration-300 ease-out"
            :class="desktopGridClass">
            <aside
                class="hidden sticky top-0 h-screen self-start border-r border-neutral-800/80 bg-neutral-900/70 backdrop-blur-sm md:block"
                :class="leftOverflowEnabled ? 'overflow-y-auto' : 'overflow-hidden'">
                <button type="button"
                    class="absolute top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 text-sm text-neutral-200 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:border-emerald-500 hover:text-emerald-300"
                    :class="leftSidebarOpen ? 'right-2' : 'left-1/2 -translate-x-1/2'"
                    :aria-label="leftSidebarOpen ? 'Collapse left sidebar' : 'Expand left sidebar'"
                    :aria-pressed="leftSidebarOpen" @click="leftSidebarOpen = !leftSidebarOpen">
                    {{ leftSidebarOpen ? "←" : "→" }}
                </button>

                <div class="h-full" :class="[leftSidebarPanelClass, leftSidebarOpen ? 'px-6 py-7' : 'p-0 invisible']">
                    <div>
                        <p class="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Akari Docs</p>
                        <h2 class="mt-3 text-lg font-semibold text-white">Table of Contents</h2>
                    </div>

                    <nav class="mt-6 space-y-1 text-sm text-neutral-300">
                        <a v-for="item in tocEntries" :key="item.href" :href="item.href"
                            @click.prevent="scrollToHeading(item.href)"
                            class="group flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-all duration-200 hover:border-neutral-800 hover:bg-neutral-800/80 hover:text-white"
                            :class="item.href === activeHeadingId ? 'text-emerald-400 border-l-2 border-emerald-500 bg-emerald-500/5' : ''">
                            <span class="min-w-0 truncate" :class="tocLabelClass(item.level)">{{ item.label }}</span>
                            <span
                                class="text-[10px] text-neutral-600 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:text-emerald-300">#</span>
                        </a>

                        <p v-if="tocEntries.length === 0" class="rounded-lg px-3 py-2 text-xs text-neutral-500">
                            No headings found in this page.
                        </p>
                    </nav>
                </div>
            </aside>

            <main class="min-w-0 border-neutral-800/80 bg-neutral-950 px-5 py-8 md:border-x md:px-10 lg:px-14">
                <div class="mx-auto flex w-full max-w-3xl flex-col gap-8">
                    <header id="document-preview" class="space-y-3 border-b border-neutral-800/80 pb-6">
                        <p class="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Document Preview</p>
                        <h1 class="text-3xl font-semibold leading-tight text-white md:text-4xl">
                            {{ safeTitle }}
                        </h1>
                    </header>

                    <section id="metadata" class="rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-5">
                        <div class="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                            <p><span class="text-neutral-500">Author:</span> {{ safeAuthor }}</p>
                            <p><span class="text-neutral-500">Description:</span> {{ safeDescription }}</p>
                        </div>
                    </section>

                    <div id="content" class="scroll-mt-24">
                        <slot />
                    </div>
                </div>
            </main>

            <aside
                class="hidden sticky top-0 h-screen self-start border-l border-neutral-800/80 bg-neutral-900/70 backdrop-blur-sm md:block"
                :class="rightOverflowEnabled ? 'overflow-y-auto' : 'overflow-hidden'">
                <button type="button"
                    class="absolute top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 text-sm text-neutral-200 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:border-emerald-500 hover:text-emerald-300"
                    :class="rightSidebarOpen ? 'left-2' : 'left-1/2 -translate-x-1/2'"
                    :aria-label="rightSidebarOpen ? 'Collapse right sidebar' : 'Expand right sidebar'"
                    :aria-pressed="rightSidebarOpen" @click="rightSidebarOpen = !rightSidebarOpen">
                    {{ rightSidebarOpen ? "→" : "←" }}
                </button>

                <div class="h-full" :class="[rightSidebarPanelClass, rightSidebarOpen ? 'px-6 py-7' : 'p-0 invisible']">
                    <div>
                        <p class="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Pages / Topics</p>
                        <h2 class="mt-3 text-lg font-semibold text-white">Navigator</h2>
                    </div>

                    <nav class="mt-6 space-y-1 text-sm text-neutral-300">
                        <button v-for="item in navigatorEntries" :key="item.slug || item.href" type="button"
                            @click="handlePageChange(item.slug || defaultNavigatorSlug)"
                            class="block w-full rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-neutral-800/80 hover:text-white"
                            :class="[item.isActive ? 'bg-neutral-800/80 text-white' : '', item.slug === props.currentSlug ? 'bg-emerald-500/10 text-emerald-400 font-medium' : '']">
                            {{ item.label }}
                        </button>

                        <p v-if="navigatorEntries.length === 0" class="rounded-lg px-3 py-2 text-xs text-neutral-500">
                            No pages indexed.
                        </p>
                    </nav>
                </div>
            </aside>
        </div>

        <footer v-if="footerData" class="border-t border-neutral-800/80 bg-neutral-950/95">
            <div class="mx-auto w-full max-w-480 px-5 py-6 md:px-10 lg:px-14">
                <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-neutral-100">{{ footerData.brand }}</p>
                        <p v-if="footerData.description" class="text-xs text-neutral-400">{{ footerData.description }}
                        </p>
                    </div>

                    <nav v-if="footerLinks.length > 0"
                        class="flex flex-wrap items-center gap-2 text-sm text-neutral-300">
                        <a v-for="link in footerLinks" :key="link.href" :href="link.href"
                            :target="link.external ? '_blank' : undefined"
                            :rel="link.external ? 'noopener noreferrer' : undefined" :aria-label="link.label"
                            :title="link.label"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-900/70 text-neutral-300 transition-all duration-150 hover:border-emerald-500/70 hover:text-white">
                            <component :is="resolveFooterIcon(link.icon)" class="h-4 w-4" aria-hidden="true" />
                            <span class="sr-only">{{ link.label }}</span>
                        </a>
                    </nav>
                </div>

                <p v-if="footerData.legalText" class="mt-4 text-xs text-neutral-500">{{ footerData.legalText }}</p>
            </div>
        </footer>
    </div>
</template>
