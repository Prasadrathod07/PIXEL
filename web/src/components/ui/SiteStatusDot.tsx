import { cn } from '@/lib/utils'
import type { SiteStatus } from '@/lib/types'

interface SiteStatusDotProps {
  status: SiteStatus | string
  className?: string
}

export function SiteStatusDot({ status, className }: SiteStatusDotProps) {
  return (
    <span
      className={cn(
        'relative inline-flex w-2 h-2 shrink-0',
        className
      )}
      title={`Status: ${status}`}
    >
      {/* Pulse ring for active states */}
      {status !== 'unknown' && (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            status === 'online' && 'bg-green-400',
            status === 'down' && 'bg-red-400',
            status === 'degraded' && 'bg-yellow-400'
          )}
          style={{ animationDuration: status === 'down' ? '0.9s' : '2s' }}
        />
      )}
      {/* Solid dot */}
      <span
        className={cn(
          'relative rounded-full w-full h-full',
          status === 'online' && 'bg-green-400',
          status === 'down' && 'bg-red-400',
          status === 'degraded' && 'bg-yellow-400',
          status === 'unknown' && 'bg-gray-400'
        )}
      />
    </span>
  )
}
