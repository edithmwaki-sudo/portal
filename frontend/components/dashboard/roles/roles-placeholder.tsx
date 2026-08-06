export function RolesPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
