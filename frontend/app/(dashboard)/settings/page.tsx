import { PageToolbar } from "@/components/dashboard/page-toolbar"

export default function SettingsPage() {
  return (
    <>
      <PageToolbar
        title="Settings"
        description="Manage your portal preferences."
      />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            The portal palette is themed from the{" "}
            <code className="font-mono text-xs font-medium text-foreground">
              --brand
            </code>{" "}
            and{" "}
            <code className="font-mono text-xs font-medium text-foreground">
              --sidebar
            </code>{" "}
            CSS variables in{" "}
            <code className="font-mono text-xs font-medium text-foreground">
              app/globals.css
            </code>
            .
          </p>
        </div>
      </div>
    </>
  )
}
