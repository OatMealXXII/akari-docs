export { default as Layout } from "./theme/Layout.vue";
export { default as LocalLayout } from "./components/LocalLayout.vue";
export { createDocsApi, createDocsRuntime } from "./runtime/docs-api";
export { useLiteI18n } from "./i18n/lite";

export type {
  FrontmatterData,
  FrontmatterValue,
  FooterData,
  FooterIconName,
  FooterLink,
  LayoutProps,
  NavItem,
  TocItem,
} from "./theme/Layout.vue";

export type {
  CreateDocsApiOptions,
  CreateDocsRuntimeOptions,
  DocsApi,
  DocsApiHeading,
  DocsApiLoadedModule,
  DocsApiPageIndexItem,
  DocsRuntime,
} from "./runtime/docs-api";

export type { LocaleCode, FrontmatterTranslatableKey } from "./i18n/lite";
