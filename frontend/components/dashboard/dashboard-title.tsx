"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "../ui/sidebar";

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 flex items-center px-4 lg:px-6 pb-3 pt-2 bg-card/70 border-b border-border">
      <div className="flex w-full items-center">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-muted animate-pulse lg:hidden" />

          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteTitle() {
  const pathname = usePathname();

  const lastSegment =
    pathname.split("/").filter(Boolean).pop() || "dashboard";

  const title = lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="flex w-full items-center">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 lg:hidden cursor-pointer rounded-md bg-primary text-white hover:brightness-110" />

        <div className="flex flex-col leading-tight">
          <h1 className="text-[16p] font-semibold">
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
}