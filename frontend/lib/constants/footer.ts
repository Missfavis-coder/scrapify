interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const FOOTER_NAV = {
  columns: [
    {
      title: "Product",
      links: [
        { label: "Browse skills", href: "/skills" },
        { label: "Pricing", href: "/pricing" },
        { label: "Mcp & Cli", href: "/mcp-cli" },
        { label: "Changelog", href: "/changelog" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ] satisfies FooterColumn[],
} as const;

export const HEADER_CENTER_NAV = [
  { label: "Discover", href: "/discover" },
  { label: "Mcp & Cli", href: "/mcp-cli" },
  { label: "Changelog", href: "/changelog" },
] as const;
