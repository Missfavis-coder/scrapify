"use client";

import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";

import { Button } from "../ui/button";
import { NavMain } from "./nav-mains";
import NavSettings from "./nav-footer";
import { Briefcase, CreditCard, FolderOpen, Gauge, Home, HouseIcon, Laptop, SparkleIcon, Sparkles, User, Wallet, X } from "lucide-react";


const navMain = [
    {
      title: "Home",
      url: "/dashboard/home",
      icon: Home,
    },
    {
      title: "Automation",
      url: "/dashboard/automations",
      icon: Sparkles,
    },
    {
      title: "Monitor",
      url: "/dashboard/monitor",
      icon: Sparkles,
    },
    {
      title: "Billing",
      url: "/dashboard/billing-usage",
      icon: Sparkles,
    },


  ];
  
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar
      className="fixed border-r border-neutral-300 bg-white "
      collapsible="icon"
      {...props}
    >

      <SidebarHeader className="relative z-10 pt-4 pb-6 px-3">
        <div className="flex items-center justify-between">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem className="flex items-center justify-center">
              <SidebarMenuButton
                
                className=" pm-3  gap-2"
              >
                <a href="/" className="cursor-pointer text-xl font-bold ">
                  Scrapify.
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setOpenMobile(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 px-3">
        <NavMain items={navMain} />
      </SidebarContent>
      
      <SidebarFooter className="relative z-10 p-4">
        <NavSettings />
      </SidebarFooter>
    </Sidebar>
  );
}
