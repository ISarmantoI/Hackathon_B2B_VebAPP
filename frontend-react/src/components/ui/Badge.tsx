import { cn } from '@/lib/utils'
import { statusColor, statusLabel } from '@/lib/format'
import type { OrderStatus } from '@/types'

export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)} {...p} />
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={statusColor[status]}>{statusLabel[status]}</Badge>
}
