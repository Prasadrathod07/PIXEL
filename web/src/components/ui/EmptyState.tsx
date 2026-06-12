import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass rounded-xl p-14 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
