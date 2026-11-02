interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

/** A grouped block of fields inside one index card. */
export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="mb-5 border-b border-line pb-2 text-sm font-medium text-ink">{title}</h3>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
