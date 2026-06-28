type FormFieldProps = {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, htmlFor, hint, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-body font-medium text-text-600"
      >
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs font-body font-normal text-text-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-body font-normal text-danger">{error}</p>
      )}
    </div>
  )
}
