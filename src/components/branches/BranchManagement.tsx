'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Plus, Building2, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import router from 'next/router'


interface Branch {
    id: string
    franchise_id: string
    name: string
    number_of_tables: number
    code: string
    status: 'ACTIVE' | 'INACTIVE' | 'TEMPORARILY_CLOSED'
    address: string
    city: string
    state: string
    country: string
    postal_code: string
    timezone: string
    opening_time: string
    closing_time: string
}

interface Staff {
    id: string;
    franchise_id: string;
    branch_id: string;
    role: {
        id: string;
        name: string;
        is_owner: boolean;
        can_manage_branches: boolean;
    };
}

interface BranchFormData {
    name: string
    code: string
    number_of_tables: number
    status: Branch['status']
    address: string
    city: string
    state: string
    country: string
    postal_code: string
    timezone: string
    opening_time: string
    closing_time: string
}

const initialFormData: BranchFormData = {
    name: '',
    code: '',
    number_of_tables: 1,
    status: 'ACTIVE',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    timezone: 'UTC',
    opening_time: '09:00',
    closing_time: '22:00'
}

export default function BranchManagement() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [formData, setFormData] = useState<BranchFormData>(initialFormData)
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
    const [staffData, setStaffData] = useState<Staff | null>(null)
    const supabase = createClient()
    const { user } = useAuthStore()


    useEffect(() => {
        checkPermissionsAndFetchData()
    }, [])

    const checkPermissionsAndFetchData = async () => {
        try {
            // Get staff data to check permissions
            const { data: mapping } = await supabase
                .from('auth_staff_mapping')
                .select('staff_id')
                .eq('auth_user_id', user?.id)
                .single()

            if (!mapping) {
                router.push('/')
                return
            }

            const { data: staff } = await supabase
                .from('staff')
                .select(`
                    *,
                    role:roles(*)
                `)
                .eq('id', mapping.staff_id)
                .single()

            if (!staff) {
                router.push('/')
                return
            }

            setStaffData(staff)

            // Only owners or staff with branch management permissions can access
            if (!staff.role.is_owner && !staff.role.can_manage_branches) {
                router.push('/')
                return
            }

            // Fetch branches based on role
            if (staff.role.is_owner) {
                const { data: branchData } = await supabase
                    .from('branches')
                    .select('*')
                    .eq('franchise_id', staff.franchise_id)
                    .order('name')

                setBranches(branchData || [])
            } else if (staff.role.can_manage_branches) {
                // Non-owner managers can only view their assigned branch
                const { data: branchData } = await supabase
                    .from('branches')
                    .select('*')
                    .eq('id', staff.branch_id)
                    .single()

                setBranches(branchData ? [branchData] : [])
            }
        } catch (error) {
            console.error('Error:', error)
            router.push('/')
        } finally {
            setLoading(false)
        }
    }

    // Add the fetchBranches function
    useEffect(() => {
        fetchBranches()
    }, [])

    const fetchBranches = async () => {
        try {
            // Get staff data to get franchise_id
            const { data: mapping } = await supabase
                .from('auth_staff_mapping')
                .select('staff_id')
                .eq('auth_user_id', user?.id)
                .single()

            if (!mapping) return

            const { data: staff } = await supabase
                .from('staff')
                .select('franchise_id')
                .eq('id', mapping.staff_id)
                .single()

            if (!staff) return

            // Get branches for the franchise
            const { data: branchData, error } = await supabase
                .from('branches')
                .select('*')
                .eq('franchise_id', staff.franchise_id)
                .order('name')

            if (error) throw error
            setBranches(branchData || [])
        } catch (error) {
            console.error('Error fetching branches:', error)
            toast.error('Failed to fetch branches')
        } finally {
            setLoading(false)
        }
    }

    // Only render if user has proper permissions
    if (!staffData?.role.is_owner && !staffData?.role.can_manage_branches) {
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Get franchise_id from staff data
            const { data: mapping } = await supabase
                .from('auth_staff_mapping')
                .select('staff_id')
                .eq('auth_user_id', user?.id)
                .single()

            if (!mapping) throw new Error('Staff mapping not found')

            const { data: staff } = await supabase
                .from('staff')
                .select('franchise_id')
                .eq('id', mapping.staff_id)
                .single()

            if (!staff) throw new Error('Staff data not found')

            if (editingBranch) {
                // Update existing branch
                const { error } = await supabase
                    .from('branches')
                    .update({
                        ...formData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingBranch.id)

                if (error) throw error
                toast.success('Branch updated successfully')
            } else {
                // Create new branch with UUID
                const branchId = uuidv4()
                const { error } = await supabase
                    .from('branches')
                    .insert([
                        {
                            id: branchId,
                            franchise_id: staff.franchise_id,
                            ...formData,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    ])

                if (error) throw error
                toast.success('Branch created successfully')
            }

            setIsAddDialogOpen(false)
            setFormData(initialFormData)
            setEditingBranch(null)
            fetchBranches()
        } catch (error: any) {
            console.error('Error saving branch:', error)
            toast.error(error.message || 'Failed to save branch')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch)
        setFormData({
            name: branch.name,
            code: branch.code,
            number_of_tables: branch.number_of_tables,
            status: branch.status,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            country: branch.country,
            postal_code: branch.postal_code || '',
            timezone: branch.timezone,
            opening_time: branch.opening_time || '09:00',
            closing_time: branch.closing_time || '22:00'
        })
        setIsAddDialogOpen(true)
    }

    const handleDelete = async (branchId: string) => {
        if (!confirm('Are you sure you want to delete this branch?')) return

        try {
            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', branchId)

            if (error) throw error
            toast.success('Branch deleted successfully')
            fetchBranches()
        } catch (error) {
            console.error('Error deleting branch:', error)
            toast.error('Failed to delete branch')
        }
    }

    const getStatusColor = (status: Branch['status']) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-500'
            case 'INACTIVE':
                return 'bg-red-500'
            case 'TEMPORARILY_CLOSED':
                return 'bg-yellow-500'
            default:
                return 'bg-gray-500'
        }
    }

    if (loading) {
        return <div>Loading...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Branch Management</h2>
                    <p className="text-muted-foreground">
                        {staffData?.role.is_owner
                            ? 'Manage all your franchise branches'
                            : 'View branch details'}
                    </p>
                </div>
                {staffData?.role.is_owner && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Branch
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingBranch ? 'Edit' : 'Add'} Branch</DialogTitle>
                                <DialogDescription>
                                    {editingBranch ? 'Edit branch details' : 'Add a new branch to your franchise'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Branch Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Branch Code</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tables">Number of Tables</Label>
                                        <Input
                                            id="tables"
                                            type="number"
                                            min="1"
                                            value={formData.number_of_tables}
                                            onChange={(e) => setFormData({ ...formData, number_of_tables: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value: Branch['status']) =>
                                                setFormData({ ...formData, status: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                <SelectItem value="TEMPORARILY_CLOSED">Temporarily Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="postal_code">Postal Code</Label>
                                        <Input
                                            id="postal_code"
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="timezone">Timezone</Label>
                                        <Input
                                            id="timezone"
                                            value={formData.timezone}
                                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="opening_time">Opening Time</Label>
                                        <Input
                                            id="opening_time"
                                            type="time"
                                            value={formData.opening_time}
                                            onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="closing_time">Closing Time</Label>
                                        <Input
                                            id="closing_time"
                                            type="time"
                                            value={formData.closing_time}
                                            onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {branches.map((branch) => (
                    <Card key={branch.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-bold">{branch.name}</CardTitle>
                            <Badge className={getStatusColor(branch.status)}>
                                {branch.status.replace('_', ' ')}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Branch Code</div>
                                    <div className="font-medium">{branch.code}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Address</div>
                                    <div className="font-medium">
                                        {branch.address}, {branch.city}<br />
                                        {branch.state}, {branch.country} {branch.postal_code}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Operating Hours</div>
                                    <div className="font-medium">
                                        {branch.opening_time} - {branch.closing_time}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Tables</div>
                                    <div className="font-medium">{branch.number_of_tables}</div>
                                </div>
                                {/* <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(branch)}
                                    >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(branch.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div> */}
                            </div>
                            {staffData?.role.is_owner && (
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(branch)}
                                    >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(branch.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}