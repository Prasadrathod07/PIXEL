import { Skeleton } from './skeleton'

export function IssueCardSkeleton() {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function SiteCardSkeleton() {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-md shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-5 w-16 rounded shrink-0" />
      </div>
    </div>
  )
}

export function TimelineEventSkeleton() {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="w-px flex-1 bg-border/30 mt-2 min-h-[2rem]" />
      </div>
      <div className="flex-1 pb-6 space-y-2 pt-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-5 flex items-start gap-4">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function IssueTableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
    </tr>
  )
}
