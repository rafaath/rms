// components/providers/AuthProvider.tsx
'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setStaff, setLoading } = useAuthStore()
    const router = useRouter()
    const supabase = createClientComponentClient()

    useEffect(() => {
        // Initialize auth store
        useAuthStore.persist.rehydrate()

        const initAuth = async () => {
            try {
                setLoading(true)
                const { data: { session } } = await supabase.auth.getSession()

                if (!session?.user) {
                    setLoading(false)
                    return
                }

                setUser(session.user)

                // Get staff data
                const { data: mapping } = await supabase
                    .from('auth_staff_mapping')
                    .select('staff_id')
                    .eq('auth_user_id', session.user.id)
                    .single()

                if (!mapping) {
                    setLoading(false)
                    return
                }

                const { data: staffData } = await supabase
                    .from('staff')
                    .select(`
                        *,
                        role:roles(*)
                    `)
                    .eq('id', mapping.staff_id)
                    .single()

                if (staffData) {
                    setStaff(staffData)
                } else {
                    setLoading(false)
                }
            } catch (error) {
                console.error('Auth error:', error)
                setLoading(false)
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setStaff(null)
                    router.push('/auth/login')
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return children
}