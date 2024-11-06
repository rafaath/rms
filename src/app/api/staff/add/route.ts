// app/api/staff/add/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with service role
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Make sure this is set in your .env file
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Received request body:', body);

        // Create the auth user using service role
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: true
        });

        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user?.id) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 400 });
        }

        // Create the staff record
        const staffId = crypto.randomUUID();
        const { data: staffData, error: staffError } = await supabaseAdmin
            .from('staff')
            .insert([{
                id: staffId,
                branch_id: body.branchId,
                franchise_id: body.franchiseId,
                first_name: body.firstName,
                last_name: body.lastName,
                email: body.email,
                generated_password: body.password,
                code: body.staffCode,
                role_id: body.roleId,
                status: 'ACTIVE',
                hire_date: new Date().toISOString(),
            }])
            .select()
            .single();

        if (staffError) {
            // Cleanup auth user if staff creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.error('Staff error:', staffError);
            return NextResponse.json({ error: staffError.message }, { status: 400 });
        }

        // Create the auth-staff mapping
        const { error: mappingError } = await supabaseAdmin
            .from('auth_staff_mapping')
            .insert([{
                auth_user_id: authData.user.id,
                staff_id: staffId,
            }]);

        if (mappingError) {
            // Cleanup both auth user and staff if mapping fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            await supabaseAdmin.from('staff').delete().eq('id', staffId);
            console.error('Mapping error:', mappingError);
            return NextResponse.json({ error: mappingError.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...staffData,
                auth_id: authData.user.id
            }
        });

    } catch (error: any) {
        console.error('Server error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}