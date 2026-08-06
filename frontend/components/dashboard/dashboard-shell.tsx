import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Navbar } from "./navbar"
import { AuthGuard } from "@/components/auth/auth-guard"

/**
 * Top-level dashboard frame: full-height sidebar as its own column on the
 * left, nav bar + main content stacked in the remaining space on the right.
 *
 * The sidebar and navbar render for every signed-in user (only the sidebar's
 * links are permission-filtered). Auth gating applies to the main content
 * area only — unauthenticated visitors are bounced to /login there, while the
 * chrome around it stays put.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-full overflow-hidden">
      <AppSidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/40">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </SidebarProvider>
  )
}
