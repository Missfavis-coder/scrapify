"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";


export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
}) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();

  const isCollapsed = state === "collapsed";
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2 px-6 py-6">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url;

            return (
              <SidebarMenuItem key={item.title}>
                <Link href={item.url} onClick={handleLinkClick}>
                <div className={clsx( isCollapsed && "-ml-5")}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={clsx(
                        "py-5 transition-all duration-200 flex items-center gap-3 font-medium rounded-md mb-2 cursor-pointer  ",
                        isActive
                          ? " bg-primary text-white px-6 "
                          : "text-secondary hover:bg-primary/10 hover:*:text-primary px-4",
                      )}
                    >
                      {!isCollapsed && (
                        <span className="text-[15px]">{item.title}</span>
                      )}{" "}
                    </SidebarMenuButton>
                  </div>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
