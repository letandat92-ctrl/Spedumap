import { TherapistNav } from '@/components/layout/TherapistNav'

export default function TherapistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <TherapistNav />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
