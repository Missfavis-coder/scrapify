import Link from "next/link";
import { MobileNavMenu } from "./mobile-nav-menu";
import { HEADER_CENTER_NAV } from "@/lib/constants/footer";


export async function Header() {
  
  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-30 flex justify-center px-3 sm:px-4">
      <div className="pointer-events-auto relative flex w-full max-w-4xl items-center justify-between gap-2 rounded-full border border-primary/[0.08] bg-background/60 py-2.5 pl-5 pr-2.5 backdrop-blur-xl sm:pl-6 shadow-3xl">
        <nav
          aria-label="Primary"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:inline-flex"
        >
          {HEADER_CENTER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <MobileNavMenu />

        </div>
      </div>
    </div>
  );
}

