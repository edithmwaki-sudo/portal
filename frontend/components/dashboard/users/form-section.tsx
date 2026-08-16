interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

/** A titled white section card used to group fields (invoice/adhoc style). */
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="rounded-lg bg-card p-6 shadow-lg shadow-black/5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
