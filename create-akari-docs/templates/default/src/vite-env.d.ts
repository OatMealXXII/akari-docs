/// <reference types="vite/client" />

declare module "*.md" {
  import type { DefineComponent } from "vue";

  interface MarkdownHeading {
    readonly level: number;
    readonly text: string;
    readonly id: string;
  }

  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    unknown
  >;
  export const metadata: Record<string, string | number | boolean>;
  export const headings: readonly MarkdownHeading[];
  export default component;
}

declare module "virtual:akari-md-index" {
  interface VirtualMarkdownHeading {
    readonly level: number;
    readonly text: string;
    readonly id: string;
  }

  interface VirtualMarkdownIndexItem {
    readonly slug: string;
    readonly href: string;
    readonly label: string;
    readonly metadata: Record<string, string | number | boolean>;
    readonly headings: readonly VirtualMarkdownHeading[];
  }

  export const markdownIndex: readonly VirtualMarkdownIndexItem[];
}
