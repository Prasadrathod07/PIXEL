'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import type { User } from '@/lib/types'

interface AppShellProps {
  user: User
  role: 'client' | 'manager'
  children: React.ReactNode
}

export function AppShell({ user, role, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        user={user}
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
