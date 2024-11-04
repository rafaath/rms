// components/auth/AuthWrapper.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuthStore } from '@/stores/auth'
import { Spinner } from '@/components/ui/spinner'

export function AuthWrapper({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const { setUser, setStaff } = useAuthStore()
    const supabase = createClientComponentClient()

    // Skip auth check for auth pages
    const isAuthPage = pathname.startsWith('/auth/')
    if (isAuthPage) {
        return <>{children}</>
    }

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    router.push('/auth/login')
                    return
                }

                setUser(user)

                // Fetch staff data
                const { data: mapping } = await supabase
                    .from('auth_staff_mapping')
                    .select('staff_id')
                    .eq('auth_user_id', user.id)
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

                    if (staff) {
                        setStaff(staff)
                    } else {
                        router.push('/auth/login')
                    }
                } else {
                    router.push('/auth/login')
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
                router.push('/auth/login')
            } finally {
                setIsLoading(false)
            }
        }

        initializeAuth()
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner />
            </div>
        )
    }

    return children
}