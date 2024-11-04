import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard/Dashboard'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'
import { SidebarProvider } from "@/components/ui/sidebar"

export default async function Home() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Get staff role
  const { data: mapping } = await supabase
    .from('auth_staff_mapping')
    .select('staff_id')
    .eq('auth_user_id', session.user.id)
    .single()

  if (mapping) {
    const { data: staff } = await supabase
      .from('staff')
      .select(`
                *,
                role:roles(*)
            `)
      .eq('id', mapping.staff_id)
      .single()

    // For staff members (non-owners), check if they have a branch assigned
    if (staff && !staff.role.is_owner && !staff.branch_id) {
      redirect('/select-branch')
    }
  }

  return (
    <SidebarProvider>
      <main className="flex w-full min-h-screen bg-background">
        <RestaurantSidebar />
        <Dashboard />
      </main>
    </SidebarProvider>
  )
}