<script setup lang="ts">
import {
    computed,
    ref,
    watch,
    onBeforeUnmount,
    onMounted,
    nextTick,
} from "vue";
import {
    DEFAULT_HEADING_SCROLL_OFFSET,
    buildTocHrefById,
    normalizeHeadingId,
    pickMonitorHeadings,
    resolveActiveHeadingByScroll,
    toActiveHref,
} from "./toc-highlight";
import { useLiteI18n, type LocaleCode } from "../i18n/lite";

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
    readonly onLocaleChange?: (locale: LocaleCode) => void;
    readonly tocItems?: readonly TocItem[];
    readonly navigatorItems?: readonly NavItem[];
    readonly currentSlug?: string;
    readonly locale?: LocaleCode;
    readonly footer?: FooterData;
}

const props = defineProps<LayoutProps>();
const { locale, setLocale, t } = useLiteI18n();
const localeOptions: ReadonlyArray<{ value: LocaleCode; label: string }> = [
    { value: "en", label: "English" },
    { value: "th", label: "ไทย" },
];

const handleLocaleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement | null;
    const nextLocale = target?.value;
    if (nextLocale === "en" || nextLocale === "th") {
        void setLocale(nextLocale);
        props.onLocaleChange?.(nextLocale);
    }
};

watch(
    () => props.locale,
    (nextLocale) => {
        if (!nextLocale || nextLocale === locale.value) {
            return;
        }

        void setLocale(nextLocale);
    },
    { immediate: true },
);

const leftSidebarOpen = ref(true);
const rightSidebarOpen = ref(true);
const mobileTocOpen = ref(false);
const mobileNavOpen = ref(false);
const MOBILE_BREAKPOINT = 768;

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
    if (supportsDom) {
        window.removeEventListener("resize", handleViewportResize);
        window.removeEventListener("keydown", handleMobileEscape);
        document.body.style.overflow = "";
    }
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
let trackedHeadingScrollSnapshot: Array<{
    id: string;
    top: number;
    isConnected: boolean;
}> = [];
let trackedTocHrefById = new Map<string, string>();
let trackedLayoutHeight = 0;
let headingOffsetsDirty = true;
const supportsDom =
    typeof window !== "undefined" && typeof document !== "undefined";
const HEADING_SCROLL_OFFSET = DEFAULT_HEADING_SCROLL_OFFSET;

const closeMobilePanels = () => {
    mobileTocOpen.value = false;
    mobileNavOpen.value = false;
};

const openMobileToc = () => {
    mobileNavOpen.value = false;
    mobileTocOpen.value = true;
};

const openMobileNav = () => {
    mobileTocOpen.value = false;
    mobileNavOpen.value = true;
};

const handleMobileEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        closeMobilePanels();
    }
};

const handleViewportResize = () => {
    if (!supportsDom) return;
    if (window.innerWidth >= MOBILE_BREAKPOINT) {
        closeMobilePanels();
    }
};

onMounted(() => {
    if (!supportsDom) return;
    handleViewportResize();
    window.addEventListener("resize", handleViewportResize);
    window.addEventListener("keydown", handleMobileEscape);
});

watch([mobileTocOpen, mobileNavOpen], ([tocOpen, navOpen]) => {
    if (!supportsDom) return;
    document.body.style.overflow = tocOpen || navOpen ? "hidden" : "";
});

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
        (heading) =>
            heading.isConnected && normalizeHeadingId(heading.id).length > 0,
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

    const getHeadings = () =>
        Array.from(content.querySelectorAll("h2, h3")) as HTMLElement[];

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

            headingObserver = new IntersectionObserver(
                (entries) => {
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
                        vals.sort(
                            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
                        );
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
                },
                { root: null, rootMargin, threshold },
            );

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
const tocSignature = computed(() =>
    (props.tocItems ?? []).map((item) => String(item.href ?? "")).join("|"),
);

watch(
    [() => props.currentSlug, () => tocSignature.value],
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

const footerIconPathMap: Record<FooterIconName, readonly string[]> = {
    docs: [
        "M4 5a2 2 0 0 1 2-2h10v16H6a2 2 0 0 0-2 2z",
        "M16 3h2a2 2 0 0 1 2 2v16h-2",
    ],
    github: [
        "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 20 5.2 4.8 4.8 0 0 0 19.9 2S18.8 1.7 16 3.6a13.3 13.3 0 0 0-7 0C6.2 1.7 5.1 2 5.1 2A4.8 4.8 0 0 0 5 5.2a5.2 5.2 0 0 0-1.3 3.6c0 5.2 3.2 6.4 6.2 6.7A3.4 3.4 0 0 0 9 18.1V22",
    ],
    home: ["M3 10.5 12 3l9 7.5", "M5 10v10h14V10"],
    external: ["M14 3h7v7", "M10 14 21 3", "M21 14v7H3V3h7"],
    link: [
        "M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L10 5",
        "M14 11a5 5 0 0 0-7.1 0L4.8 13.1a5 5 0 1 0 7.1 7.1L14 19",
    ],
};

const resolveFooterIconPaths = (iconName?: string): readonly string[] => {
    if (!iconName) return footerIconPathMap.link;
    const normalized = iconName.toLowerCase() as FooterIconName;
    return footerIconPathMap[normalized] ?? footerIconPathMap.link;
};

const defaultNavigatorSlug = computed(() => {
    return navigatorEntries.value[0]?.slug ?? "";
});

const handlePageChange = (slug: string) => {
    if (!slug || slug === props.currentSlug) return;
    if (!props.onPageChange) return;

    closeMobilePanels();
    props.onPageChange(slug);
};

const safeFrontmatter = computed<FrontmatterData>(() => {
    return props.frontmatter ?? {};
});

const safeAuthor = computed(() => {
    const author = safeFrontmatter.value.author;
    return typeof author === "string" && author.trim().length > 0
        ? author
        : t("unknown");
});

const safeDescription = computed(() => {
    const description = safeFrontmatter.value.description;
    return typeof description === "string" && description.trim().length > 0
        ? description
        : "-";
});

const safeTitle = computed(() => {
    const title = safeFrontmatter.value.title;
    return typeof title === "string" && title.trim().length > 0
        ? title
        : "Akari Docs";
});

// Smooth scroll to heading and update URL hash without jumping
const scrollToHeading = (href: string) => {
    if (!supportsDom) return;

    const id = href.startsWith("#") ? href.slice(1) : href;
    const el = document.getElementById(id);
    if (!el) return;
    const top =
        el.getBoundingClientRect().top + window.scrollY - HEADING_SCROLL_OFFSET;
    activeHeadingId.value = toActiveHref(id, trackedTocHrefById) ?? `#${id}`;
    window.scrollTo({ top, behavior: "smooth" });
    closeMobilePanels();
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
                    :aria-label="leftSidebarOpen ? t('collapseLeftSidebar') : t('expandLeftSidebar')"
                    :aria-pressed="leftSidebarOpen" @click="leftSidebarOpen = !leftSidebarOpen">
                    {{ leftSidebarOpen ? "←" : "→" }}
                </button>

                <div class="h-full" :class="[leftSidebarPanelClass, leftSidebarOpen ? 'px-6 py-7' : 'p-0 invisible']">
                    <div>
                        <p class="text-[11px] uppercase tracking-[0.25em] text-neutral-500">Akari Docs</p>
                        <h2 class="mt-3 text-lg font-semibold text-white">{{ t("tableOfContents") }}</h2>
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
                            {{ t("noHeadingsFound") }}
                        </p>
                    </nav>
                </div>
            </aside>

            <main
                class="min-w-0 border-neutral-800/80 bg-neutral-950 px-4 py-6 pb-24 md:border-x md:px-10 md:py-8 md:pb-8 lg:px-14">
                <div class="mx-auto flex w-full max-w-3xl flex-col gap-8">
                    <header id="document-preview" class="space-y-3 border-b border-neutral-800/80 pb-6">
                        <div class="flex items-start justify-between gap-4">
                            <p class="text-[11px] uppercase tracking-[0.25em] text-neutral-500">{{ t("documentPreview")
                            }}</p>
                            <label class="inline-flex items-center gap-2 text-[11px] text-neutral-400"
                                :aria-label="t('language')">
                                <span>{{ t("language") }}</span>
                                <select :value="locale" @change="handleLocaleChange"
                                    class="rounded-md border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[11px] font-medium text-neutral-200 outline-none transition-colors hover:border-emerald-500/70 focus:border-emerald-500/70">
                                    <option v-for="option in localeOptions" :key="option.value" :value="option.value">
                                        {{ option.label }}
                                    </option>
                                </select>
                            </label>
                        </div>
                        <h1 class="text-3xl font-semibold leading-tight text-white md:text-4xl">
                            {{ safeTitle }}
                        </h1>
                    </header>

                    <section id="metadata" class="rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-5">
                        <div class="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                            <p><span class="text-neutral-500">{{ t("author") }}:</span> {{ safeAuthor }}</p>
                            <p><span class="text-neutral-500">{{ t("description") }}:</span> {{ safeDescription }}</p>
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
                    :aria-label="rightSidebarOpen ? t('collapseRightSidebar') : t('expandRightSidebar')"
                    :aria-pressed="rightSidebarOpen" @click="rightSidebarOpen = !rightSidebarOpen">
                    {{ rightSidebarOpen ? "→" : "←" }}
                </button>

                <div class="h-full" :class="[rightSidebarPanelClass, rightSidebarOpen ? 'px-6 py-7' : 'p-0 invisible']">
                    <div>
                        <p class="text-[11px] uppercase tracking-[0.25em] text-neutral-500">{{ t("pagesTopics") }}</p>
                        <h2 class="mt-3 text-lg font-semibold text-white">{{ t("navigator") }}</h2>
                    </div>

                    <nav class="mt-6 space-y-1 text-sm text-neutral-300">
                        <button v-for="item in navigatorEntries" :key="item.slug || item.href" type="button"
                            @click="handlePageChange(item.slug || defaultNavigatorSlug)"
                            class="block w-full rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-neutral-800/80 hover:text-white"
                            :class="[item.isActive ? 'bg-neutral-800/80 text-white' : '', item.slug === props.currentSlug ? 'bg-emerald-500/10 text-emerald-400 font-medium' : '']">
                            {{ item.label }}
                        </button>

                        <p v-if="navigatorEntries.length === 0" class="rounded-lg px-3 py-2 text-xs text-neutral-500">
                            {{ t("noPagesIndexed") }}
                        </p>
                    </nav>
                </div>
            </aside>
        </div>

        <transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <button v-if="mobileTocOpen || mobileNavOpen" type="button" :aria-label="t('closeMenu')"
                class="fixed inset-0 z-40 bg-black/60 md:hidden" @click="closeMobilePanels" />
        </transition>

        <div
            class="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800/80 bg-neutral-950/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
            <div class="mx-auto flex w-full max-w-3xl items-center gap-2">
                <button type="button"
                    class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors"
                    :class="mobileTocOpen ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300' : 'border-neutral-700 bg-neutral-900/80 text-neutral-100 hover:border-emerald-500/70 hover:text-emerald-300'"
                    :aria-expanded="mobileTocOpen" aria-controls="mobile-toc-panel" @click="openMobileToc">
                    {{ t("tableOfContents") }}
                </button>
                <button type="button"
                    class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors"
                    :class="mobileNavOpen ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300' : 'border-neutral-700 bg-neutral-900/80 text-neutral-100 hover:border-emerald-500/70 hover:text-emerald-300'"
                    :aria-expanded="mobileNavOpen" aria-controls="mobile-nav-panel" @click="openMobileNav">
                    {{ t("pages") }}
                </button>
            </div>
        </div>

        <transition enter-active-class="transition-transform duration-200" enter-from-class="-translate-x-full"
            enter-to-class="translate-x-0" leave-active-class="transition-transform duration-200"
            leave-from-class="translate-x-0" leave-to-class="-translate-x-full">
            <aside id="mobile-toc-panel" v-if="mobileTocOpen"
                class="fixed inset-y-0 left-0 z-50 w-[86%] max-w-sm overflow-y-auto border-r border-neutral-800 bg-neutral-900 px-4 py-5 md:hidden">
                <div class="mb-5 flex items-center justify-between">
                    <h2 class="text-base font-semibold text-white">{{ t("tableOfContents") }}</h2>
                    <button type="button"
                        class="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200"
                        @click="mobileTocOpen = false">
                        {{ t("close") }}
                    </button>
                </div>

                <nav class="space-y-1 text-sm text-neutral-300">
                    <a v-for="item in tocEntries" :key="`mobile-${item.href}`" :href="item.href"
                        @click.prevent="scrollToHeading(item.href)"
                        class="group flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-all duration-200 hover:border-neutral-800 hover:bg-neutral-800/80 hover:text-white"
                        :class="item.href === activeHeadingId ? 'text-emerald-400 border-l-2 border-emerald-500 bg-emerald-500/5' : ''">
                        <span class="min-w-0 truncate" :class="tocLabelClass(item.level)">{{ item.label }}</span>
                        <span
                            class="text-[10px] text-neutral-600 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:text-emerald-300">#</span>
                    </a>

                    <p v-if="tocEntries.length === 0" class="rounded-lg px-3 py-2 text-xs text-neutral-500">
                        {{ t("noHeadingsFound") }}
                    </p>
                </nav>
            </aside>
        </transition>

        <transition enter-active-class="transition-transform duration-200" enter-from-class="translate-x-full"
            enter-to-class="translate-x-0" leave-active-class="transition-transform duration-200"
            leave-from-class="translate-x-0" leave-to-class="translate-x-full">
            <aside id="mobile-nav-panel" v-if="mobileNavOpen"
                class="fixed inset-y-0 right-0 z-50 w-[86%] max-w-sm overflow-y-auto border-l border-neutral-800 bg-neutral-900 px-4 py-5 md:hidden">
                <div class="mb-5 flex items-center justify-between">
                    <h2 class="text-base font-semibold text-white">{{ t("pages") }}</h2>
                    <button type="button"
                        class="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200"
                        @click="mobileNavOpen = false">
                        {{ t("close") }}
                    </button>
                </div>

                <nav class="space-y-1 text-sm text-neutral-300">
                    <button v-for="item in navigatorEntries" :key="`mobile-${item.slug || item.href}`" type="button"
                        @click="handlePageChange(item.slug || defaultNavigatorSlug)"
                        class="block w-full rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-neutral-800/80 hover:text-white"
                        :class="[item.isActive ? 'bg-neutral-800/80 text-white' : '', item.slug === props.currentSlug ? 'bg-emerald-500/10 text-emerald-400 font-medium' : '']">
                        {{ item.label }}
                    </button>

                    <p v-if="navigatorEntries.length === 0" class="rounded-lg px-3 py-2 text-xs text-neutral-500">
                        {{ t("noPagesIndexed") }}
                    </p>
                </nav>
            </aside>
        </transition>

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
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path v-for="(path, index) in resolveFooterIconPaths(link.icon)" :key="index"
                                    :d="path" />
                            </svg>
                            <span class="sr-only">{{ link.label }}</span>
                        </a>
                    </nav>
                </div>

                <p v-if="footerData.legalText" class="mt-4 text-xs text-neutral-500">{{ footerData.legalText }}</p>
            </div>
        </footer>
    </div>
</template>
