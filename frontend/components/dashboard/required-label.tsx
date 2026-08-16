export function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1 text-sm font-medium">
      {children} <span className="text-destructive">*</span>
    </label>
  );
}
