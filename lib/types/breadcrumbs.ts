export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

export interface PageBreadcrumbProps {
  items: BreadcrumbCrumb[];
}
