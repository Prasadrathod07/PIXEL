'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { StatusBadge, SeverityBadge } from '@/components/issues/IssueBadge'
import type { Issue } from '@/lib/types'

interface GlobalSearchProps {
  role: 'client' | 'manager'
}

export function GlobalSearch({ role }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open || issues.length > 0) return
    setLoading(true)
    fetch('/api/issues')
      .then((r) => r.json())
      .then((data) => setIssues(Array.isArray(data) ? data : []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }, [open, issues.length])

  const select = (issue: Issue) => {
    setOpen(false)
    const path = role === 'manager' ? `/manager/issues/${issue.id}` : `/issues/${issue.id}`
    router.push(path)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 transition-colors"
        aria-label="Open search (⌘K)"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Search issues…</span>
        <kbd className="hidden sm:inline text-[10px] border border-border rounded px-1 py-px font-mono leading-none">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search issues by title…" />
        <CommandList>
          <CommandEmpty>
            {loading ? 'Loading…' : 'No issues found.'}
          </CommandEmpty>
          {issues.length > 0 && (
            <CommandGroup heading="Issues">
              {issues.map((issue) => (
                <CommandItem
                  key={issue.id}
                  value={issue.title}
                  onSelect={() => select(issue)}
                  className="flex items-start gap-3 py-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {issue.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(issue as Issue & { site?: { name: string } }).site?.name ?? 'Unknown site'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SeverityBadge severity={issue.severity} />
                    <StatusBadge status={issue.status} />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
