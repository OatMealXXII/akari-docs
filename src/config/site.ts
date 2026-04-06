export interface SiteFooterLink {
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
  readonly icon?: string;
}

export interface SiteFooterData {
  readonly brand: string;
  readonly description?: string;
  readonly links?: readonly SiteFooterLink[];
}

export const siteFooter: SiteFooterData = {
  brand: "OatMealXXII",
  description:
    "Zero-bloat documentation framework for fast markdown publishing.",
  links: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Docs", href: "/introduction", icon: "docs" },
    {
      label: "GitHub",
      href: "https://github.com/OatMealXXII",
      external: true,
      icon: "github",
    },
  ],
};
