'use client'

import { Bell } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Notification } from '@/lib/types'

interface NotificationListProps {
  notifications: Notification[]
  onMarkRead?: (ids: string[]) => void
}

export function NotificationList({ notifications, onMarkRead }: NotificationListProps) {
  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Notifications</span>
          {unread.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && onMarkRead && (
          <button
            onClick={() => onMarkRead(unread.map((n) => n.id))}
            className="text-xs text-primary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 ${!n.read ? 'bg-primary/5' : ''}`}
            >
              <p className="text-sm text-foreground">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
