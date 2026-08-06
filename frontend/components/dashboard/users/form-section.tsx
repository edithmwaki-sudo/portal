interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

/** Legacy-style form grouping: a headed section inside the multi-part record form. */
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <fieldset className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      <div className="grid gap-4">{children}</div>
    </fieldset>
  );
}