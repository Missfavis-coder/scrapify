

import { AppSidebar } from "@/components/shared/app-sidebar";
import { SiteHeader } from "@/components/shared/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PropsWithChildren } from "react";


export default function Applayout({ children }: PropsWithChildren) {

  return (

      <SidebarProvider className="bg-white text-secondary">
        <AppSidebar variant="sidebar" />
        <SidebarInset className=" flex flex-col overflow-hidden">
          <SiteHeader/>
          <main className="flex-1 overflow-y-auto overflow-x-hidden ">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>

  );
}
