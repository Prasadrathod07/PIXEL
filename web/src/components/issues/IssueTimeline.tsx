'use client'

import { useEffect, useRef } from 'react'
import {
  PlusCircle,
  ArrowRight,
  AlertTriangle,
  MessageSquare,
  MessageCircle,
  CheckCircle,
  XCircle,
  Sparkles,
  Paperclip,
} from 'lucide-react'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import { StatusBadge, SeverityBadge } from '@/components/issues/IssueBadge'
import type { TimelineEvent, IssueStatus, IssueSeverity } from '@/lib/types'

const EVENT_CONFIG: Record<
  string,
  { icon: React.ElementType; iconColor: string; ringColor: string; bgColor: string }
> = {
  created: {
    icon: PlusCircle,
    iconColor: 'text-blue-400',
    ringColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
  },
  status_changed: {
    icon: ArrowRight,
    iconColor: 'text-purple-400',
    ringColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
  },
  severity_changed: {
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    ringColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
  },
  comment_added: {
    icon: MessageSquare,
    iconColor: 'text-muted-foreground',
    ringColor: 'border-border',
    bgColor: 'bg-muted/50',
  },
  response_added: {
    icon: MessageCircle,
    iconColor: 'text-green-400',
    ringColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
  },
  resolved: {
    icon: CheckCircle,
    iconColor: 'text-green-400',
    ringColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
  },
  closed: {
    icon: XCircle,
    iconColor: 'text-muted-foreground',
    ringColor: 'border-border',
    bgColor: 'bg-muted/50',
  },
  ai_analyzed: {
    icon: Sparkles,
    iconColor: 'text-blue-400',
    ringColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
  },
  attachment_added: {
    icon: Paperclip,
    iconColor: 'text-muted-foreground',
    ringColor: 'border-border',
    bgColor: 'bg-muted/50',
  },
}

const DEFAULT_CONFIG = {
  icon: MessageSquare,
  iconColor: 'text-muted-foreground',
  ringColor: 'border-border',
  bgColor: 'bg-muted/50',
}

function EventDescription({ event }: { event: TimelineEvent }) {
  switch (event.event_type) {
    case 'created':
      return <span>Reported this issue</span>
    case 'status_changed':
      return (
        <span className="flex items-center gap-2 flex-wrap">
          <span>Status changed</span>
          {event.old_value && <StatusBadge status={event.old_value as IssueStatus} />}
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          {event.new_value && <StatusBadge status={event.new_value as IssueStatus} />}
        </span>
      )
    case 'severity_changed':
      return (
        <span className="flex items-center gap-2 flex-wrap">
          <span>Severity changed</span>
          {event.old_value && <SeverityBadge severity={event.old_value as IssueSeverity} />}
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          {event.new_value && <SeverityBadge severity={event.new_value as IssueSeverity} />}
        </span>
      )
    case 'resolved':
      return <span>Issue has been resolved</span>
    case 'closed':
      return <span>Issue has been closed</span>
    case 'ai_analyzed':
      return <span>AI analysis completed</span>
    case 'attachment_added':
      return <span>Attachment added</span>
    default:
      return <span>{event.content ?? 'Activity recorded'}</span>
  }
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const cfg = EVENT_CONFIG[event.event_type] ?? DEFAULT_CONFIG
  const Icon = cfg.icon
  const initials = event.author ? getInitials(event.author.name) : '?'
  const isContentEvent =
    event.event_type === 'response_added' || event.event_type === 'comment_added'

  return (
    <div className="flex gap-4">
      {/* Icon column */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10',
            cfg.bgColor,
            cfg.ringColor
          )}
        >
          <Icon className={cn('w-3.5 h-3.5', cfg.iconColor)} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[24px]" />}
      </div>

      {/* Card */}
      <div className={cn('flex-1', !isLast && 'pb-5')}>
        <div className="glass rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 uppercase">
                {initials}
              </div>
              <span className="text-sm font-medium text-foreground">
                {event.author?.name ?? 'System'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDateTime(event.created_at)}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            <EventDescription event={event} />
          </div>

          {isContentEvent && event.content && (
            <div className="mt-3 text-sm text-foreground bg-muted/30 rounded-md p-3 leading-relaxed whitespace-pre-wrap border border-border/50">
              {event.content}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface IssueTimelineProps {
  events: TimelineEvent[]
}

export function IssueTimeline({ events }: IssueTimelineProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLElement>('[data-ti]')
    if (!items) return
    items.forEach((el, i) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(10px)'
      const t = setTimeout(() => {
        el.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }, i * 70)
      return () => clearTimeout(t)
    })
  }, [events])

  if (events.length === 0) {
    return (
      <div className="glass rounded-lg p-6 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    )
  }

  return (
    <div ref={ref}>
      {events.map((event, idx) => (
        <div key={event.id} data-ti>
          <TimelineItem event={event} isLast={idx === events.length - 1} />
        </div>
      ))}
    </div>
  )
}
