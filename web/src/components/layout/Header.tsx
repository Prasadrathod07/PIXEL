'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { DarkModeToggle } from './DarkModeToggle'
import { ThemeColorPicker } from './ThemeColorPicker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

const pathTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/issues': 'My Issues',
  '/issues/new': 'Report Issue',
  '/sites': 'My Sites',
  '/notifications': 'Notifications',
  '/manager/dashboard': 'Dashboard',
  '/manager/issues': 'All Issues',
  '/manager/clients': 'Clients',
  '/manager/sites': 'All Sites',
  '/manager/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  if (pathTitles[pathname]) return pathTitles[pathname]
  if (pathname.startsWith('/issues/')) return 'Issue Details'
  if (pathname.startsWith('/sites/')) return 'Site Details'
  if (pathname.startsWith('/manager/issues/')) return 'Issue Details'
  if (pathname.startsWith('/manager/clients/')) return 'Client Details'
  if (pathname.startsWith('/manager/sites/')) return 'Site Details'
  return 'Pixel Assessment'
}

interface HeaderProps {
  user: User
  onMenuClick?: () => void
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-foreground tracking-tight shrink-0">{title}</h2>
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end">
        <ThemeColorPicker />
        <DarkModeToggle />

        <NotificationBell userId={user.id} role={user.role} />

        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-foreground leading-tight">{user.name}</p>
            <p
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wide',
                user.role === 'manager' ? 'text-purple-400' : 'text-blue-400'
              )}
            >
              {user.role}
            </p>
          </div>
          <Avatar size="sm">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
