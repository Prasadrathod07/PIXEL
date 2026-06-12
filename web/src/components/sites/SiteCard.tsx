import Link from 'next/link'
import { Globe, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SITE_STATUS_COLORS } from '@/lib/constants'
import type { Site } from '@/lib/types'

interface SiteCardProps {
  site: Site
  href: string
}

export function SiteCard({ site, href }: SiteCardProps) {
  return (
    <Link href={href} className="block glass rounded-lg p-4 hover:glow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Globe className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{site.name}</p>
          <p className="text-xs text-muted-foreground truncate">{site.url}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
            SITE_STATUS_COLORS[site.status]
          )}
        >
          {site.status}
        </span>
      </div>
      {(site.open_issues_count ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5" />
          {site.open_issues_count} open issue{site.open_issues_count !== 1 ? 's' : ''}
        </div>
      )}
    </Link>
  )
}
