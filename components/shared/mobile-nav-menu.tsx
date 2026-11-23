"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { HEADER_CENTER_NAV } from "@/lib/constants/footer";
import { cn } from "@/lib/utils";
import { ListCheck, X } from "lucide-react";

export function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={open ? "Close menu" : "Open menu"}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground md:hidden"
      >
        <ListCheck
          className={cn(
            "absolute size-4 transition-all duration-200 ease-out",
            open ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
        />
        <X
          className={cn(
            "absolute size-4 transition-all duration-200 ease-out",
            open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-50 mt-2 p-4 md:hidden flex flex-col justify-center items-center absolute -right-18 ">
        {HEADER_CENTER_NAV.map((item) => (
          <DropdownMenuItem key={item.href} className="cursor-pointer w-full">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
