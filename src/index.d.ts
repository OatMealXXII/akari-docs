import type { DefineComponent } from "vue";
import type { Plugin } from "vite";

export type FrontmatterValue = string | number | boolean;

export interface AkariMarkdownHeading {
  readonly level: number;
  readonly text: string;
  readonly id: string;
}

export interface AkariMarkdownDocument {
  readonly id: string;
  readonly content: string;
  readonly metadata: Readonly<Record<string, FrontmatterValue>>;
}

export interface AkariMarkdownRenderOutput {
  readonly html: string;
  readonly metadata: Readonly<Record<string, FrontmatterValue>>;
  readonly headings: readonly AkariMarkdownHeading[];
}

export interface AkariMarkdownHook {
  transform?: (document: AkariMarkdownDocument) => AkariMarkdownDocument;
  render?: (
    document: AkariMarkdownDocument,
    next: (document: AkariMarkdownDocument) => AkariMarkdownRenderOutput,
  ) => AkariMarkdownRenderOutput | undefined;
  transformHtml?: (
    html: string,
    document: AkariMarkdownDocument,
  ) => string | undefined;
}

export interface AkariMarkdownPluginOptions {
  readonly hooks?: readonly AkariMarkdownHook[];
}

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

export type FooterIconName = "docs" | "github" | "home" | "external" | "link";

export interface FooterLink {
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
  readonly icon?: FooterIconName | string;
}

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
  readonly onPageChange?: (slug: string) => void;
  readonly tocItems?: readonly LocalLayoutTocItem[];
  readonly navigatorItems?: readonly LocalLayoutNavItem[];
  readonly currentSlug?: string;
}

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
  readonly currentSlug: import("vue").Ref<string>;
  readonly currentModule: import("vue").Ref<DocsApiLoadedModule | null>;
  readonly isLoading: import("vue").Ref<boolean>;
  readonly locale: import("vue").Ref<string>;
  readonly tocItems: import("vue").ComputedRef<readonly TocItem[]>;
  readonly navigatorItems: import("vue").ComputedRef<readonly NavItem[]>;
  readonly setLocale: (locale: string) => void;
  readonly loadPage: (slug?: string, locale?: string) => Promise<void>;
  readonly onPageChange: (
    slug: string,
    navigate?: (slug: string, locale: string) => Promise<unknown> | unknown,
  ) => Promise<void>;
}

export declare function akariMarkdownPlugin(
  options?: AkariMarkdownPluginOptions,
): Plugin;

export declare const Layout: DefineComponent<
  LayoutProps,
  Record<string, never>,
  unknown
>;

export declare const LocalLayout: DefineComponent<
  LocalLayoutProps,
  Record<string, never>,
  unknown
>;

export declare function createDocsApi(options: CreateDocsApiOptions): DocsApi;
export declare function createDocsRuntime(
  options: CreateDocsRuntimeOptions,
): DocsRuntime;
