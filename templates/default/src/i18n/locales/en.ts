export const enMessages = {
  collapseLeftSidebar: "Collapse left sidebar",
  expandLeftSidebar: "Expand left sidebar",
  collapseRightSidebar: "Collapse right sidebar",
  expandRightSidebar: "Expand right sidebar",
  tableOfContents: "Table of Contents",
  documentPreview: "Document Preview",
  author: "Author",
  description: "Description",
  pagesTopics: "Pages / Topics",
  navigator: "Navigator",
  noHeadingsFound: "No headings found in this page.",
  noPagesIndexed: "No pages indexed.",
  closeMenu: "Close menu",
  pages: "Pages",
  close: "Close",
  language: "Language",
  unknown: "Unknown",
  loading: "Loading...",
} as const;

export type TranslationKey = keyof typeof enMessages;
export type LocaleMessageSchema = Record<TranslationKey, string>;
