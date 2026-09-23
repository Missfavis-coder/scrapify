"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import {
  PiCreditCard,
  PiSignOut,
  PiSpinnerGap,
  PiSquaresFour,
  PiUserCircle,
} from "react-icons/pi";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { USER_MENU } from "@/lib/constants/user-menu";
import type { HeaderUser } from "@/lib/types/auth";

interface UserMenuProps {
  user: HeaderUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        toast.error("Could not sign out. Try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Network error signing out.");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleBilling() {
    if (openingPortal) return;
    if (!user.hasBilling) {
      router.push(USER_MENU.pricingHref);
      return;
    }
    setOpeningPortal(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (data.code === "NO_CUSTOMER") {
          router.push(USER_MENU.pricingHref);
          return;
        }
        toast.error(data.error ?? USER_MENU.portalErrorMessage);
        return;
      }
      const data = (await response.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error(USER_MENU.portalNetworkErrorMessage);
    } finally {
      setOpeningPortal(false);
    }
  }

  const initials = getInitials(user.displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Open menu for ${user.displayName}`}
          className="overflow-hidden rounded-full p-0"
        >
          <Avatar className="size-9">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {user.displayName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={USER_MENU.dashboardHref}>
            <PiSquaresFour className="size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={USER_MENU.accountHref}>
            <PiUserCircle className="size-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={openingPortal}
          onSelect={(event) => {
            event.preventDefault();
            void handleBilling();
          }}
        >
          {openingPortal ? (
            <PiSpinnerGap className="size-4 animate-spin" />
          ) : (
            <PiCreditCard className="size-4" />
          )}
          {openingPortal ? "Opening..." : "Billing History"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          <PiSignOut className="size-4" />
          {signingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
