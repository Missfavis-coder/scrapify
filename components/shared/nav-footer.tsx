
"use client";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useSidebar } from "../ui/sidebar";
import { PiArrowRightBold } from "react-icons/pi";

import { useLogout, useMe } from "@/lib/hooks/use-auth";

const NavSettings = () => {
  const { state } = useSidebar();
  const { data: user, isLoading } = useMe();
  const logout = useLogout();

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  if (state === "collapsed") {
    return (
      <div className="flex flex-col items-center gap-3 p-2">
        <div
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium"
          title={user?.name || "User"}
        >
          {isLoading ? "..." : initials}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full py-6 px-4 bg-[#fef29e]/40 text-white">
      <div className="space-y-1">
        <h1 className="text-[14px] text-neutral-700 text-center tracking-wide truncate">
          {isLoading ? "Loading profile..." : user?.name || "User"}
        </h1>

        <p className="text-xs text-neutral-500 text-center truncate">
          {user?.email || ""}
        </p>
      </div>

      <div className="mt-3">
        <Button
          variant="ghost"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          className="w-full text-sm font-bold text-center cursor-pointer gap-2 text-secondary bg-white rounded-md hover:bg-white disabled:opacity-50"
        >
          <PiArrowRightBold className="size-3 text-white" />
          {logout.isPending ? "Logging out..." : "Log Out"}
        </Button>
      </div>
    </Card>
  );
};

export default NavSettings;
