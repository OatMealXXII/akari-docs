import "./style.css";

export { akariMarkdownPlugin } from "./plugin";
export { default as Layout } from "./theme/Layout.vue";
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
  AkariMarkdownDocument,
  AkariMarkdownHeading,
  AkariMarkdownHook,
  AkariMarkdownPluginOptions,
  AkariMarkdownRenderOutput,
} from "./core/plugins/akari-md-plugin";
