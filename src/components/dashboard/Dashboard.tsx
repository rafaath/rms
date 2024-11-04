// components/dashboard/Dashboard.tsx
'use client'

import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import TableManagement from './TableManagement'
import OrderManagement from './OrderManagement'
import MenuManagement from './MenuManagement'
import BranchManagement from "../branches/BranchManagement"
import TableOrders from "../pos/TableOrders"  // Add this import
import ActiveOrders from './ActiveOrders'
import { useAuthStore } from "@/stores/auth"
import RoleManagement from "../roles/RoleManagement"
import SessionPayment from "../pos/SessionPayment"
import InventoryManagement from "@/components/inventory/InventoryManagement"
import OrderHistory from "./OrderHistory"

export default function Dashboard() {
    const { setTheme } = useTheme()
    const { activeSection } = useAuthStore()

    const components = {
        tables: TableManagement,
        orders: OrderManagement,
        menu: MenuManagement,
        branches: BranchManagement,
        roles: RoleManagement,
        inventory: InventoryManagement,
        orderHistory: OrderHistory,
        activeOrders: ActiveOrders,
        tableOrders: TableOrders,
        payments: SessionPayment,  // Add this line
    }

    const ActiveComponent = components[activeSection as keyof typeof components]

    return (
        <div className="flex-1 flex flex-col h-screen">
            <header className="border-b bg-background w-full px-6">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger />
                        <h1 className="text-2xl font-bold">Restaurant Management System</h1>
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => setTheme("light")}>
                            <SunIcon className="h-[1.2rem] w-[1.2rem]" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setTheme("dark")}>
                            <MoonIcon className="h-[1.2rem] w-[1.2rem]" />
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-auto px-6 py-6">
                <ActiveComponent />
            </main>
        </div>
    )
}