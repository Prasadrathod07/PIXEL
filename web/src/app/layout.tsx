import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/layout/QueryProvider'

export const metadata: Metadata = {
  title: 'Pixel — Client Issue Tracker',
  description: 'Professional website monitoring and issue management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(222 47% 8%)',
              border: '1px solid hsl(217 33% 14%)',
              color: 'hsl(210 40% 98%)',
            },
          }}
        />
      </body>
    </html>
  )
}
