import {
    Building2,
    Users2,
    Shield,
    TableProperties,
    ClipboardList,
    UtensilsCrossed,
    BarChart3,
    Package,
    CreditCard,
    ClipboardSignature,
    History,
    BarChart,  // Add this import
} from "lucide-react"

export const SYSTEM_MODULES = {
    franchise: {
        id: 'franchise',
        label: 'Franchise Management',
        icon: Building2,
        permissions: {
            view: 'View Franchises',
            create: 'Create Franchises',
            edit: 'Edit Franchises',
            delete: 'Delete Franchises'
        },
        navItem: {
            title: "Franchise",
            value: "franchise",
            requiresOwner: true // Special flag for owner-only modules
        }
    },
    branch: {
        id: 'branch',
        label: 'Branch Management',
        icon: Building2,
        permissions: {
            view: 'View Branches',
            create: 'Create Branches',
            edit: 'Edit Branches',
            delete: 'Delete Branches'
        },
        navItem: {
            title: "Branches",
            value: "branches"
        }
    },
    roles: {
        id: 'roles',
        label: 'Role Management',
        icon: Shield,
        permissions: {
            view: 'View Roles',
            create: 'Create Roles',
            edit: 'Edit Roles',
            delete: 'Delete Roles'
        },
        navItem: {
            title: "Roles",
            value: "roles"
        }
    },
    staff: {
        id: 'staff',
        label: 'Staff Management',
        icon: Users2,
        permissions: {
            view: 'View Staff',
            create: 'Create Staff',
            edit: 'Edit Staff',
            delete: 'Delete Staff'
        },
        navItem: {
            title: "Staff",
            value: "staff"
        }
    },
    tables: {
        id: 'tables',
        label: 'Table Management',
        icon: TableProperties,
        permissions: {
            view: 'View Tables',
            edit: 'Edit Tables',
            assign: 'Assign Tables'
        },
        navItem: {
            title: "Tables",
            value: "tables",
            isCore: true // Flag for core features that are always shown
        }
    },
    orderss: {
        id: 'orders',
        label: 'Order Management',
        icon: ClipboardList,
        permissions: {
            view: 'View Orders',
            create: 'Create Orders',
            edit: 'Edit Orders',
            delete: 'Delete Orders'
        },
        navItem: {
            title: "Orders",
            value: "orders",
            isCore: true
        }
    },
    menu: {
        id: 'menu',
        label: 'Menu Management',
        icon: UtensilsCrossed,
        permissions: {
            view: 'View Menu',
            create: 'Create Items',
            edit: 'Edit Items',
            delete: 'Delete Items'
        },
        navItem: {
            title: "Menu",
            value: "menu",
            isCore: true
        }
    },
    analytics: {
        id: 'analytics',
        label: 'Reports & Analytics',
        icon: BarChart,
        permissions: {
            view: 'View Analytics',
            export: 'Export Reports',
        },
        navItem: {
            title: "Analytics",
            value: "analytics",
            isCore: true // Not a core feature, requires permission
        }
    },
    // Just add to SYSTEM_MODULES:
    inventory: {
        id: 'inventory',
        label: 'Inventory Management',
        icon: Package,
        permissions: {
            view: 'View Inventory',
            create: 'Add Items',
            edit: 'Update Items',
            delete: 'Remove Items'
        },
        navItem: {
            title: "Inventory",
            value: "inventory",
            isCore: true
        }
    },
    orderHistory: {
        id: 'orderHistory',
        label: 'Order History',
        icon: History,
        permissions: {
            view: 'View Order History',
            export: 'Export Order History',
        },
        navItem: {
            title: "Order History",
            value: "orderHistory",
            isCore: true
        }
    },
    activeOrders: {
        id: 'activeOrders',
        label: 'Active Orders',
        icon: UtensilsCrossed,
        permissions: {
            view: 'View Active Orders',
            update: 'Update Order Status',
        },
        navItem: {
            title: "Active Orders",
            value: "activeOrders",
            isCore: true
        }
    },
    tableOrders: {
        id: 'tableOrders',
        label: 'Take Orders',
        icon: ClipboardSignature,
        permissions: {
            view: 'View Table Orders',
            create: 'Create Table Orders',
            edit: 'Edit Table Orders',
            void: 'Void Table Orders'
        },
        navItem: {
            title: "Take Orders",
            value: "tableOrders",
            isCore: true
        }
    },
    payments: {
        id: 'payments',
        label: 'Payments',
        icon: CreditCard,
        permissions: {
            view: 'View Payments',
            process: 'Process Payments',
        },
        navItem: {
            title: "Payments",
            value: "payments",
            isCore: true
        }
    }
    // Add new modules here
} as const

export type SystemModule = keyof typeof SYSTEM_MODULES
export type ModulePermissions = typeof SYSTEM_MODULES[SystemModule]['permissions']

// Helper to check if user has permission
export const hasPermission = (
    permissions: Record<string, boolean>,
    module: SystemModule,
    action: keyof ModulePermissions
) => {
    return permissions[`${module}_${action}`] || false
}

// Helper to get all permissions for a role
export const getFullPermissions = () => {
    return Object.entries(SYSTEM_MODULES).reduce((acc, [moduleKey, module]) => {
        Object.keys(module.permissions).forEach(permission => {
            acc[`${moduleKey}_${permission}`] = false
        })
        return acc
    }, {} as Record<string, boolean>)
}

// Helper to check if module is accessible
export const canAccessModule = (
    permissions: Record<string, boolean>,
    module: SystemModule,
    isOwner: boolean
) => {
    const moduleConfig = SYSTEM_MODULES[module]

    if (moduleConfig.navItem.isCore) return true
    if (moduleConfig.navItem.requiresOwner && !isOwner) return false

    return Object.keys(moduleConfig.permissions).some(
        permission => permissions[`${module}_${permission}`]
    )
}