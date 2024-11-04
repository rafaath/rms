// components/pos/BranchSelector.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Branch {
    id: string
    name: string
    code: string
    city: string
    state: string
}

export function POSBranchSelector() {
    const [branches, setBranches] = useState<Branch[]>([])
    const { user, selectedBranch, setSelectedBranch } = useAuthStore()
    const supabase = createClient()

    useEffect(() => {
        const fetchBranches = async () => {
            if (!user?.id) return

            try {
                // Get staff mapping
                const { data: mapping } = await supabase
                    .from('auth_staff_mapping')
                    .select('staff_id')
                    .eq('auth_user_id', user.id)
                    .single()

                if (!mapping) return

                // Get staff data
                const { data: staff } = await supabase
                    .from('staff')
                    .select('franchise_id, role:roles(*)')
                    .eq('id', mapping.staff_id)
                    .single()

                if (!staff) return

                // Fetch branches
                const { data: branchData } = await supabase
                    .from('branches')
                    .select('*')
                    .eq('franchise_id', staff.franchise_id)
                    .eq('status', 'ACTIVE')
                    .order('name')

                if (branchData) {
                    setBranches(branchData)
                    // If no branch is selected, select the first one
                    if (!selectedBranch && branchData.length > 0) {
                        setSelectedBranch(branchData[0])
                    }
                }
            } catch (error) {
                console.error('Error fetching branches:', error)
            }
        }

        fetchBranches()
    }, [user, supabase, setSelectedBranch])

    if (!selectedBranch) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Select a Branch</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedBranch?.id}
                        onValueChange={(branchId) => {
                            const branch = branches.find(b => b.id === branchId)
                            setSelectedBranch(branch || null)
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name} ({branch.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
        )
    }

    return null
}