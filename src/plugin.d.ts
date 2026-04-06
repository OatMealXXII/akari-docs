import type { Plugin } from "vite";

type FrontmatterValue = string | number | boolean;

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

export declare function akariMarkdownPlugin(
  options?: AkariMarkdownPluginOptions,
): Plugin;
