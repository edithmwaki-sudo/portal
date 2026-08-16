"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronLeft, GraduationCap } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { navItems, type NavItem } from "@/config/nav-items"
import { siteConfig } from "@/config/site"
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user"
import { cn } from "@/lib/utils"

/** Shared nav-button styling: 3px emerald left rail, white/6 hovers. */
const navButtonClass = cn(
  "min-h-12 gap-2.5 rounded-none border-l-[3px] border-l-transparent px-4 text-[14px] text-[#b3bfd4]",
  "transition-colors duration-200 ease-linear hover:bg-white/5 hover:text-white",
  "data-active:border-l-[var(--brand)] data-active:bg-white/5 data-active:text-white data-active:hover:bg-white/10",
)

/**
 * A route counts as active for a nav destination when it is an exact match or
 * any of its descendants (pathname starts with `href + "/"`). This keeps a
 * group's label highlighted across its whole tree, e.g. Students stays active
 * on /student, /student/search or /student/26/view.
 */
function isActiveHref(href: string | undefined, pathname: string): boolean {
  if (!href) return false
  const base = href.replace(/\/+$/, "")
  return pathname === base || pathname.startsWith(base + "/")
}

function GroupChildren({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  return (
    <>
      {item.children!.map((child) => (
        <SidebarMenuSubItem key={child.href}>
          <SidebarMenuSubButton
            asChild
            isActive={pathname === child.href}
            className="h-10 gap-2.5 px-3 text-sm text-[#8296b0] hover:bg-white/5 hover:text-white data-active:text-[var(--brand)]"
          >
            <Link href={child.href!}>
              <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
              <span>{child.label}</span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </>
  )
}

/**
 * When the sidebar is collapsed to icon-only there is no room for the inline
 * sub-list, so the group becomes a flyout menu (same children, different
 * container). Uses shadcn components only — no hand-rolled primitives.
 */
function CollapsedGroupFlyout({
  item,
  childActive,
}: {
  item: NavItem
  childActive: boolean
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            className={cn(
              navButtonClass,
              childActive &&
                "border-l-[var(--brand)] bg-white/5 text-white hover:bg-white/10",
            )}
          >
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={12}
          className="w-48"
        >
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-[#8296b0]">
            {item.label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.children!.map((child) => (
            <DropdownMenuItem key={child.href} asChild>
              <Link href={child.href!} className="gap-2.5 text-sm">
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                <span>{child.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function SidebarNavItem({
  item,
  open,
  onOpenChange,
}: {
  item: NavItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const childActive =
    item.children?.some((child) => isActiveHref(child.href, pathname)) ??
    false

  if (item.children) {
    if (state === "collapsed") {
      return <CollapsedGroupFlyout item={item} childActive={childActive} />
    }

    return (
      <Collapsible
        open={open}
        onOpenChange={onOpenChange}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.label}
              className={cn(
                navButtonClass,
                childActive &&
                  "border-l-[var(--brand)] bg-white/5 text-white",
                open && "bg-white/5 text-white",
              )}
            >
              <item.icon />
              <span>{item.label}</span>
              {open ? (
                <ChevronDown className="ml-auto shrink-0" />
              ) : (
                <ChevronLeft className="ml-auto shrink-0" />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <SidebarMenuSub className="mx-4 border-l border-white/6 py-1 pl-3">
              <GroupChildren item={item} pathname={pathname} />
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === item.href}
        tooltip={item.label}
        className={navButtonClass}
      >
        <Link href={item.href!}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
    const { permissions } = usePermissions()
  const [openGroup, setOpenGroup] = useState<string | null>(
    () =>
      navItems.find((item) =>
        item.children?.some((child) => isActiveHref(child.href, pathname)),
      )?.label ?? null,
  )

  const visibleItems = navItems
    .filter((item) => {
      if (!hasAnyPermission(permissions, item.permissions)) return false
      if (!item.children) return true
      return item.children.some((child) =>
        hasAnyPermission(permissions, child.permissions),
      )
    })
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) =>
        hasAnyPermission(permissions, child.permissions),
      ),
    }))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 shrink-0 flex-row items-center gap-2.5 border-b border-white/6 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <SidebarMenuButton
          size="lg"
          tooltip={siteConfig.schoolName}
          className="size-9 shrink-0 rounded-md p-0 data-[active=true]:bg-transparent"
          asChild
        >
          <Link href="/" aria-label={siteConfig.schoolName}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand)] text-white shadow-[0_4px_12px_rgba(5,150,105,0.35)]">
              <GraduationCap className="size-5" strokeWidth={2} />
            </span>
          </Link>
        </SidebarMenuButton>
        <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-semibold leading-tight text-white">
            {siteConfig.schoolName}
          </span>
          <span className="truncate text-xs leading-tight text-[#8296b0]">
            {siteConfig.description}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-3">
          <SidebarMenu className="border-y border-sidebar-border divide-y divide-sidebar-border">
            {visibleItems.map((item) => (
              <SidebarNavItem
                key={item.label}
                item={item}
                open={openGroup === item.label}
                onOpenChange={(open) =>
                  setOpenGroup(open ? item.label : null)
                }
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
