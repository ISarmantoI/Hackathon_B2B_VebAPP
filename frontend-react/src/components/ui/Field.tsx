import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
