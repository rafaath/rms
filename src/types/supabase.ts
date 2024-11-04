export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            franchises: {
                Row: {
                    id: string
                    name: string
                    code: string
                    status: string
                    owner_name: string | null
                    contact_email: string | null
                    contact_phone: string | null
                    logo_url: string | null
                    created_at: string | null
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    code: string
                    status?: string
                    owner_name?: string | null
                    contact_email?: string | null
                    contact_phone?: string | null
                    logo_url?: string | null
                    created_at?: string | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    code?: string
                    status?: string
                    owner_name?: string | null
                    contact_email?: string | null
                    contact_phone?: string | null
                    logo_url?: string | null
                    created_at?: string | null
                    updated_at?: string
                }
            }
            staff: {
                Row: {
                    id: string
                    branch_id: string
                    franchise_id: string
                    first_name: string
                    last_name: string
                    code: string
                    role_id: string
                    status: string
                    email: string | null
                    phone: string | null
                    hire_date: string
                    created_at: string | null
                    updated_at: string
                }
                Insert: {
                    id?: string
                    branch_id: string
                    franchise_id: string
                    first_name: string
                    last_name: string
                    code: string
                    role_id: string
                    status?: string
                    email?: string | null
                    phone?: string | null
                    hire_date: string
                    created_at?: string | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    branch_id?: string
                    franchise_id?: string
                    first_name?: string
                    last_name?: string
                    code?: string
                    role_id?: string
                    status?: string
                    email?: string | null
                    phone?: string | null
                    hire_date?: string
                    created_at?: string | null
                    updated_at?: string
                }
            }
        }
    }
}