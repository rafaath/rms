'use client'
import { SYSTEM_MODULES, canAccessModule } from '@/config/permissions'
import {
    TableProperties,
    UtensilsCrossed,
    ClipboardList,
    UserCircle,
    LogOut,
    Building2,
    Users2,
    BarChart3,
    Settings,
    Building,
    Shield
} from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react"

interface Branch {
    id: string
    name: string
    code: string
    city: string
    state: string
    status: 'ACTIVE' | 'INACTIVE' | 'TEMPORARILY_CLOSED'
}



interface Staff {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: {
        name: string;
        is_owner: boolean;
        can_manage_franchises: boolean;
        can_manage_branches: boolean;
        can_manage_roles: boolean;
        can_manage_tables: boolean;
        can_manage_orders: boolean;
        can_manage_menu: boolean;
        can_manage_staff: boolean;
        can_view_reports: boolean;
        permissions?: Record<string, boolean>; // For granular permissions
    };
    accessible_branches?: Branch[];
}

export function RestaurantSidebar() {
    const { user, activeSection, setActiveSection, selectedBranch, setSelectedBranch } = useAuthStore()
    const [staffData, setStaffData] = useState<Staff | null>(null)
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()


    // In RestaurantSidebar.tsx, update the fetchStaffData function:

    useEffect(() => {
        const fetchStaffData = async () => {
            setLoading(true)

            if (!user?.id) {
                setLoading(false)
                return
            }

            try {
                // First get the staff_id from auth mapping
                const { data: mapping } = await supabase
                    .from('auth_staff_mapping')
                    .select('staff_id')
                    .eq('auth_user_id', user.id)
                    .single()

                if (!mapping) return

                // Then get staff data with complete role information
                const { data: staffWithRole } = await supabase
                    .from('staff')
                    .select(`
                    *,
                    role:roles (
                        id,
                        name,
                        is_owner,
                        can_manage_franchises,
                        can_manage_branches,
                        can_manage_roles,
                        can_manage_tables,
                        can_manage_orders,
                        can_manage_menu,
                        can_manage_staff,
                        can_view_reports,
                        permissions
                    )
                `)
                    .eq('id', mapping.staff_id)
                    .single()

                if (staffWithRole) {
                    console.log('Staff with role:', staffWithRole) // For debugging
                    setStaffData(staffWithRole)

                    // Fetch branches based on role
                    if (staffWithRole.role.is_owner) {
                        const { data: branchData } = await supabase
                            .from('branches')
                            .select('*')
                            .eq('franchise_id', staffWithRole.franchise_id)
                            .eq('status', 'ACTIVE')
                            .order('name')

                        if (branchData) {
                            setBranches(branchData)
                        }
                    } else {
                        // For non-owners, fetch and select their specific branch
                        const { data: branchData } = await supabase
                            .from('branches')
                            .select('*')
                            .eq('id', staffWithRole.branch_id)
                            .eq('status', 'ACTIVE')
                            .single()

                        if (branchData) {
                            setBranches([branchData])
                            setSelectedBranch(branchData)
                        }
                    }
                }
            } catch (error) {
                console.error('Error in fetchStaffData:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStaffData()
    }, [user, supabase, setSelectedBranch])


    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }


    // Update your navigationItems array in the RestaurantSidebar component:
    const navigationItems = Object.values(SYSTEM_MODULES)
        .map(module => ({
            title: module.navItem.title,
            icon: module.icon,
            value: module.navItem.value,
            show: module.navItem.isCore ||
                (module.navItem.requiresOwner ? staffData?.role?.is_owner :
                    canAccessModule(staffData?.role?.permissions || {}, module.id, staffData?.role?.is_owner || false))
        }))
        .filter(item => item.show)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/auth/login')
    }


    return (
        <Sidebar>
            <SidebarHeader className="border-b border-border p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>
                                {staffData?.first_name?.[0]}{staffData?.last_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">
                                {staffData ? `${staffData.first_name} ${staffData.last_name}` : 'Loading...'}
                            </h2>
                            <p className="text-sm text-muted-foreground">{staffData?.role?.name}</p>
                        </div>
                    </div>
                    {/* Only show branch selector for non-owners or when owner wants to filter view */}
                    {(!staffData?.role?.is_owner || selectedBranch) && branches.length > 1 && (
                        <div className="space-y-2">
                            <Select
                                value={selectedBranch?.id}
                                onValueChange={(branchId) => {
                                    const branch = branches.find(b => b.id === branchId)
                                    setSelectedBranch(branch || null)
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue>
                                        {selectedBranch?.name || 'All Branches'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {staffData?.role?.is_owner && (
                                        <SelectItem value="all">All Branches</SelectItem>
                                    )}
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name} ({branch.code}) - {branch.city}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {staffData?.role?.is_owner && (
                                <p className="text-xs text-muted-foreground">
                                    Optional: Select a branch to filter view
                                </p>
                            )}
                        </div>
                    )}
                    {selectedBranch && (
                        <div className="text-sm text-muted-foreground">
                            Viewing: {selectedBranch.name} ({selectedBranch.city}, {selectedBranch.state})
                        </div>
                    )}
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        onClick={() => setActiveSection(item.value)}
                                        isActive={activeSection === item.value}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-border p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => router.push('/profile')}>
                            <UserCircle className="h-4 w-4" />
                            <span>Profile</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {staffData?.role?.is_owner && (
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => router.push('/settings')}>
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            className="text-red-500 hover:text-red-600"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}