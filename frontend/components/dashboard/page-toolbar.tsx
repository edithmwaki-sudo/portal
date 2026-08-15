"use client"

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PageToolbarAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  /** Use href for navigation, onClick for in-place actions — never both. */
  href?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Red text — for genuinely page-level destructive actions only. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface PageToolbarLink {
  label: string;
  href: string;
}

interface PageToolbarProps {
  title: string;
  description?: string;
  /** Sibling links at this point in the nav hierarchy. */
  quickLinks?: PageToolbarLink[];
  /** Label for the consolidated actions dropdown. */
  menuLabel?: string;
  /** Page-level (non-record-specific) actions collapsed into the dropdown. */
  menuActions?: PageToolbarAction[];
  /** The 1–2 most-used page actions, always visible. */
  primaryActions?: PageToolbarAction[];
}

/**
 * Reusable per-page action bar — the first thing rendered inside each module
 * page's main content. Not part of the dashboard shell; pages opt into it.
 */
export function PageToolbar({
  title,
  description,
  quickLinks,
  menuLabel,
  menuActions,
  primaryActions,
}: PageToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const menuWrapperRef = useRef<HTMLSpanElement>(null);
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (menuActions?.length && menuWrapperRef.current) {
      setMenuWidth(menuWrapperRef.current.offsetWidth);
    }
  }, [menuActions, pathname]);

  return (
    <div className="mx-[50px] my-[30px] flex flex-col gap-3 rounded-lg bg-white px-6 py-4 shadow-lg shadow-black/5">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {quickLinks && quickLinks.length > 0 && (
            <Select value={pathname} onValueChange={(href) => router.push(href)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Go to..." />
              </SelectTrigger>
              <SelectContent align="end">
                {quickLinks.map((link) => (
                  <SelectItem key={link.href} value={link.href}>
                    {link.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {menuActions && menuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span ref={menuWrapperRef}>
                  <Button variant="outline">
                    {menuLabel ?? "Manage"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={
                  typeof menuWidth === "number"
                    ? { minWidth: menuWidth }
                    : undefined
                }
              >
                {menuActions.map((action) => {
                  const className = cn(
                    "whitespace-nowrap",
                    action.destructive && "text-red-600 focus:text-red-600"
                  );
                  return action.href ? (
                    <DropdownMenuItem
                      key={action.label}
                      asChild
                      className={className}
                    >
                      <Link href={action.href}>{action.label}</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={action.onClick}
                      className={className}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {primaryActions && primaryActions.length > 0 && (
            <div className="flex items-center gap-2">
              {primaryActions.map((action) => {
                const content = (
                  <>
                    {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                    {action.label}
                  </>
                );
                return action.href ? (
                  <Button
                    asChild
                    key={action.label}
                    variant={action.variant ?? "default"}
                    disabled={action.disabled}
                  >
                    <Link href={action.href}>{content}</Link>
                  </Button>
                ) : (
                  <Button
                    key={action.label}
                    variant={action.variant ?? "default"}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {content}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}