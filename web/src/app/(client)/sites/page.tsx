import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { SiteCard } from '@/components/sites/SiteCard'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata = { title: 'My Sites — Pixel' }

export default async function ClientSitesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const siteList = sites ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Sites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {siteList.length} site{siteList.length !== 1 ? 's' : ''} monitored
        </p>
      </div>

      {siteList.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No sites assigned yet"
          description="Your manager will add your websites here. Check back soon."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {siteList.map((site) => (
            <SiteCard key={site.id} site={site} href={`/sites/${site.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
