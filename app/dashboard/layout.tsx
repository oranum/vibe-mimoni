'use client'

import { AuthRequired } from '@/components/auth/AuthRequired'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthRequired>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </AuthRequired>
  )
} 