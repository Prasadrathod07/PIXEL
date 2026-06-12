'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Globe,
  AlertCircle,
  Bell,
  Plus,
  Users,
  LogOut,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User } from '@/lib/types'

interface SidebarProps {
  user: User
  role: 'client' | 'manager'
  isOpen?: boolean
  onClose?: () => void
}

type NavItem = { href: string; label: string; icon: React.ElementType; accent?: boolean; showIssueBadge?: boolean }

const clientNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sites', label: 'My Sites', icon: Globe },
  { href: '/issues', label: 'My Issues', icon: AlertCircle, showIssueBadge: true },
  { href: '/issues/new', label: 'Report Issue', icon: Plus, accent: true },
]

const managerNav: NavItem[] = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/issues', label: 'All Issues', icon: AlertCircle, showIssueBadge: true },
  { href: '/manager/clients', label: 'Clients', icon: Users },
  { href: '/manager/sites', label: 'All Sites', icon: Globe },
]

export default function Sidebar({ user, role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { unreadCount } = useNotifications(user.id)
  const [openIssueCount, setOpenIssueCount] = useState(0)
  const nav = role === 'manager' ? managerNav : clientNav

  useEffect(() => {
    const fetchCount = async () => {
      let query = supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(resolved,closed)')
      if (role === 'client') {
        query = query.eq('created_by', user.id)
      }
      const { count } = await query
      setOpenIssueCount(count ?? 0)
    }
    fetchCount()
  }, [supabase, role, user.id])

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/manager/dashboard') return pathname === href
    if (href === '/issues' && pathname === '/issues/new') return false
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
    <aside className={cn(
      'w-64 h-screen border-r border-border flex flex-col shrink-0 bg-card/80 backdrop-blur-sm transition-transform duration-300 z-50',
      // Desktop: always visible
      'lg:relative lg:translate-x-0',
      // Mobile: fixed drawer, slide in/out
      'fixed top-0 left-0',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    )}>
      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border shrink-0">
        <div
          className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 0 12px hsl(217 91% 60% / 0.15)' }}
        >
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">Pixel</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{role} portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            Navigation
          </p>
        </div>

        {nav.map(({ href, label, icon: Icon, accent, showIssueBadge }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border',
                active
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : accent
                  ? 'text-muted-foreground hover:text-foreground hover:bg-primary/5 hover:border-primary/10 border-transparent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-all duration-150',
                  active ? 'text-primary' : 'group-hover:scale-105',
                  accent && !active ? 'text-primary/60' : ''
                )}
              />
              <span className="flex-1 font-medium">{label}</span>
              {showIssueBadge && openIssueCount > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center justify-center leading-none border border-amber-500/20">
                  {openIssueCount > 99 ? '99+' : openIssueCount}
                </span>
              )}
              {!showIssueBadge && active && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
            </Link>
          )
        })}

        {/* Notifications link */}
        <Link
          href={role === 'manager' ? '/manager/notifications' : '/notifications'}
          className={cn(
            'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border',
            pathname.includes('/notifications')
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent'
          )}
        >
          <Bell className="w-4 h-4 shrink-0 transition-all duration-150 group-hover:scale-105" />
          <span className="flex-1 font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent/20 border border-border/50 group">
          <Avatar size="sm" className="shrink-0">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate leading-tight">{user.name}</p>
            <span
              className={cn(
                'text-[10px] font-semibold px-1.5 py-px rounded uppercase tracking-wide',
                role === 'manager'
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'bg-blue-500/10 text-blue-400'
              )}
            >
              {role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
