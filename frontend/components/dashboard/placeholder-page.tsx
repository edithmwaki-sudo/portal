import { PageToolbar, type PageToolbarAction } from "@/components/dashboard/page-toolbar"

interface PlaceholderPageProps {
  title: string
  description?: string
  message: string
  actions?: PageToolbarAction[]
  overflowActions?: PageToolbarAction[]
}

export function PlaceholderPage({
  title,
  description,
  message,
  actions,
  overflowActions,
}: PlaceholderPageProps) {
  return (
    <>
      <PageToolbar
        title={title}
        description={description}
        primaryActions={actions}
        menuActions={overflowActions}
      />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </>
  )
}