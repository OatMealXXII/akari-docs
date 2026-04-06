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

export declare function akariMarkdownPlugin(
  options?: AkariMarkdownPluginOptions,
): Plugin;

export declare const Layout: DefineComponent<
  LayoutProps,
  Record<string, never>,
  unknown
>;
