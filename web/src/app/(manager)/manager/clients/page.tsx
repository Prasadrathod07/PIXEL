import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import type { User } from '@/lib/types'
import { AddClientButton } from '@/components/clients/AddClientButton'
import { ClientsTable } from '@/components/clients/ClientsTable'

export default async function ManagerClientsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawClients }, { data: allSites }, { data: allIssues }] =
    await Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('id, client_id'),
      supabase
        .from('issues')
        .select('id, site_id, status')
        .not('status', 'in', '("resolved","closed")'),
    ])

  const clients = (rawClients ?? []) as User[]
  const sites = (allSites ?? []) as Array<{ id: string; client_id: string }>
  const openIssues = (allIssues ?? []) as Array<{ id: string; site_id: string; status: string }>

  const clientRows = clients.map((c) => {
    const clientSites = sites.filter((s) => s.client_id === c.id)
    const siteIds = new Set(clientSites.map((s) => s.id))
    const openCount = openIssues.filter((i) => siteIds.has(i.site_id)).length
    return { client: c, siteCount: clientSites.length, openCount }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} registered client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddClientButton />
      </div>

      {clients.length === 0 ? (
        <div className="glass rounded-lg p-14 text-center">
          <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-base font-medium text-foreground mb-2">No clients yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first client to get started.
          </p>
          <AddClientButton />
        </div>
      ) : (
        <ClientsTable clientRows={clientRows} />
      )}
    </div>
  )
}
