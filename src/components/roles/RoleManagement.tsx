'use client'
import { SYSTEM_MODULES, getFullPermissions } from '@/config/permissions'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Plus, Shield, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

// Define all possible permissions
const PERMISSION_GROUPS = {
    branch: {
        label: 'Branch Management',
        permissions: {
            view: 'View Branches',
            create: 'Create Branches',
            edit: 'Edit Branches',
            delete: 'Delete Branches'
        }
    },
    staff: {
        label: 'Staff Management',
        permissions: {
            view: 'View Staff',
            create: 'Create Staff',
            edit: 'Edit Staff',
            delete: 'Delete Staff'
        }
    },
    roles: {
        label: 'Role Management',
        permissions: {
            view: 'View Roles',
            create: 'Create Roles',
            edit: 'Edit Roles',
            delete: 'Delete Roles'
        }
    },
    tables: {
        label: 'Table Management',
        permissions: {
            view: 'View Tables',
            edit: 'Edit Tables',
            assign: 'Assign Tables'
        }
    },
    orders: {
        label: 'Order Management',
        permissions: {
            view: 'View Orders',
            create: 'Create Orders',
            edit: 'Edit Orders',
            delete: 'Delete Orders'
        }
    },
    menu: {
        label: 'Menu Management',
        permissions: {
            view: 'View Menu',
            create: 'Create Items',
            edit: 'Edit Items',
            delete: 'Delete Items'
        }
    },
    reports: {
        label: 'Reports',
        permissions: {
            view: 'View Reports',
            export: 'Export Reports'
        }
    }
} as const

type PermissionGroups = typeof PERMISSION_GROUPS
type PermissionKey = keyof PermissionGroups

interface Role {
    id: string
    name: string
    description: string
    permissions: Record<string, boolean>
    created_at: string
    updated_at: string
}

export default function RoleManagement() {
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: getFullPermissions()
    })
    const supabase = createClient()
    const { user } = useAuthStore()

    useEffect(() => {
        fetchRoles()
    }, [])

    // In RoleManagement.tsx, update the fetchRoles function:

    const fetchRoles = async () => {
        try {
            // First get the staff_id from auth mapping
            const { data: mapping } = await supabase
                .from('auth_staff_mapping')
                .select('staff_id')
                .eq('auth_user_id', user?.id)
                .single()

            if (!mapping) {
                console.error('No staff mapping found')
                return
            }

            // Then get staff with role to check if owner
            const { data: staffData } = await supabase
                .from('staff')
                .select(`
                *,
                role:roles (*)
            `)
                .eq('id', mapping.staff_id)
                .single()

            if (!staffData?.role?.is_owner) {
                console.error('User is not an owner')
                return
            }

            // Finally fetch all roles
            const { data: rolesData, error } = await supabase
                .from('roles')
                .select('*')
                .order('name')

            if (error) {
                throw error
            }

            console.log('Fetched roles:', rolesData) // For debugging
            setRoles(rolesData || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Failed to fetch roles')
        } finally {
            setLoading(false)
        }
    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const roleData = {
                name: formData.name,
                description: formData.description,
                permissions: formData.permissions,
                is_owner: false, // Never allow creating owner roles through UI
                updated_at: new Date().toISOString()
            }

            if (editingRole) {
                const { error } = await supabase
                    .from('roles')
                    .update(roleData)
                    .eq('id', editingRole.id)

                if (error) throw error
                toast.success('Role updated successfully')
            } else {
                const { error } = await supabase
                    .from('roles')
                    .insert([{
                        id: uuidv4(),
                        ...roleData,
                        created_at: new Date().toISOString()
                    }])

                if (error) throw error
                toast.success('Role created successfully')
            }

            setIsDialogOpen(false)
            resetForm()
            fetchRoles()
        } catch (error: any) {
            console.error('Error:', error)
            toast.error(error.message || 'Failed to save role')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            permissions: Object.entries(PERMISSION_GROUPS).reduce((acc, [group, { permissions }]) => {
                Object.keys(permissions).forEach(perm => {
                    acc[`${group}_${perm}`] = false
                })
                return acc
            }, {} as Record<string, boolean>)
        })
        setEditingRole(null)
    }

    const handleEdit = (role: Role) => {
        setEditingRole(role)
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (roleId: string) => {
        if (!confirm('Are you sure you want to delete this role?')) return

        try {
            const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', roleId)

            if (error) throw error
            toast.success('Role deleted successfully')
            fetchRoles()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Failed to delete role')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Role Management</h2>
                    <p className="text-muted-foreground">Create and manage custom roles</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingRole ? 'Edit' : 'Create'} Role</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Role Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label>Permissions</Label>
                                    <Accordion type="single" collapsible className="w-full">
                                        {Object.values(SYSTEM_MODULES).map(module => (
                                            <AccordionItem key={module.id} value={module.id}>
                                                <AccordionTrigger className="text-lg font-semibold">
                                                    <module.icon className="h-4 w-4 mr-2" />
                                                    {module.label}
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="space-y-4 p-4">
                                                        {Object.entries(module.permissions).map(([key, label]) => {
                                                            const permKey = `${module.id}_${key}`
                                                            return (
                                                                <div key={permKey} className="flex items-center justify-between">
                                                                    <Label htmlFor={permKey}>{label}</Label>
                                                                    <Switch
                                                                        id={permKey}
                                                                        checked={formData.permissions[permKey]}
                                                                        onCheckedChange={(checked) => {
                                                                            setFormData({
                                                                                ...formData,
                                                                                permissions: {
                                                                                    ...formData.permissions,
                                                                                    [permKey]: checked
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {roles.map((role) => (
                    <Card key={role.id}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                {role.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                            <Accordion type="single" collapsible className="w-full">
                                {Object.entries(PERMISSION_GROUPS).map(([group, { label, permissions }]) => {
                                    const hasPermissions = Object.keys(permissions).some(
                                        key => role.permissions[`${group}_${key}`]
                                    )
                                    if (!hasPermissions) return null

                                    return (
                                        <AccordionItem key={group} value={group}>
                                            <AccordionTrigger>{label}</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-2">
                                                    {Object.entries(permissions).map(([key, label]) => {
                                                        const permKey = `${group}_${key}`
                                                        if (!role.permissions[permKey]) return null
                                                        return (
                                                            <div key={permKey} className="text-sm">
                                                                âœ“ {label}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(role)}
                                >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(role.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}