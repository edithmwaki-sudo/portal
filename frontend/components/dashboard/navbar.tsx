"use client"

import Link from "next/link"
import { Bell, ChevronsUpDown, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { siteConfig } from "@/config/site"
import { useAuth } from "@/lib/auth/auth-context"

/**
 * Static hamburger: three stacked bars. Icon never changes regardless of the
 * sidebar / mobile sheet open state.
 */
function HamburgerIcon() {
  return (
    <span
      className="flex size-4 flex-col items-center justify-center gap-[3px]"
      aria-hidden="true"
    >
      <span className="block h-[2px] w-4 rounded-full bg-current" />
      <span className="block h-[2px] w-4 rounded-full bg-current" />
      <span className="block h-[2px] w-4 rounded-full bg-current" />
    </span>
  )
}

/** "Jane Doe" -> "JD" */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

interface NavbarProps {
  title?: string
}

export function Navbar({ title = siteConfig.name }: NavbarProps) {
  const { toggleSidebar } = useSidebar()
  const { user, logout } = useAuth()

  const displayName = user?.name ?? ""
  const roleName = user?.role?.displayName ?? ""

  return (
    <header className="sticky top-0 z-30 flex h-[56px] shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm transition-colors">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle navigation"
        className="hover:bg-muted"
        onClick={toggleSidebar}
      >
        <HamburgerIcon />
      </Button>
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <Bell />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 gap-2 px-2 data-[state=open]:bg-muted"
            >
              <Avatar className="size-6">
                <AvatarFallback className="text-xs">
                  {displayName ? initials(displayName) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{displayName || "…"}</span>
              <ChevronsUpDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate">{displayName}</span>
              {roleName && (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {roleName}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault()
                void logout()
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}