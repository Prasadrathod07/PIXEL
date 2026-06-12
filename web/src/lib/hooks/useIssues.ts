import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { Issue } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL || ''

export function useIssues(filters?: { site_id?: string; status?: string }) {
  return useQuery<Issue[]>({
    queryKey: ['issues', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.site_id) params.set('site_id', filters.site_id)
      if (filters?.status) params.set('status', filters.status)
      const { data } = await axios.get(`${API}/api/issues?${params}`)
      return data
    },
  })
}

export function useIssue(id: string) {
  return useQuery<Issue>({
    queryKey: ['issues', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/issues/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Issue> & { id: string }) => {
      const { data } = await axios.patch(`${API}/api/issues/${id}`, updates)
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['issues'] })
      qc.setQueryData(['issues', data.id], data)
    },
  })
}
