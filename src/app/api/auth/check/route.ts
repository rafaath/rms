import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { session }, error } = await supabase.auth.getSession()

        return NextResponse.json({
            authenticated: !!session,
            session,
            error: error?.message,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            // Don't include the actual key in production
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        })
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
        }, { status: 500 })
    }
}