interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const HEADER_CENTER_NAV = [
  { label: "Usecases", href: "/use-cases" },
  { label: "Privacy", href: "/privacy" },
] as const;
