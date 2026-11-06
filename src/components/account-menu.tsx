"use client";
import { startTransition } from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  Globe2,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";
import type { NavigationViewer } from "@/lib/navigation-viewer";
import { signOutAction } from "@/app/actions";
import { Button } from "./ui/button";
export function AccountMenu({ viewer }: { viewer: NavigationViewer }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="secondary"
          aria-label="Account menu"
          className="account-trigger"
        >
          <UserRound />
          <span className="account-name">{viewer.displayName}</span>
          <ChevronDown />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="account-menu" align="end" sideOffset={10}>
          <Menu.Label className="account-menu-label">
            {viewer.displayName}
          </Menu.Label>
          <Menu.Item asChild>
            <Link href="/studio">
              <Globe2 /> My globe
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link href="/studio?settings=profile" scroll={false}>
              <Settings2 /> Profile settings
            </Link>
          </Menu.Item>
          {viewer.profileHref && (
            <Menu.Item asChild>
              <Link href={viewer.profileHref}>
                <UserRound /> Public profile
              </Link>
            </Menu.Item>
          )}
          <Menu.Separator className="account-menu-separator" />
          <Menu.Item
            onSelect={() =>
              startTransition(async () => {
                await signOutAction();
              })
            }
          >
            <LogOut /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
