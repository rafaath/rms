'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type MenuItem = {
    name: string
    price: number
}

type OrderItem = {
    menuItem: MenuItem
    quantity: number
}

type Order = {
    id: number
    tableNumber: number
    items: OrderItem[]
    status: 'pending' | 'preparing' | 'served' | 'paid'
    totalAmount: number
    createdAt: Date
}

const initialOrders: Order[] = [
    {
        id: 1,
        tableNumber: 1,
        items: [
            { menuItem: { name: 'Pasta', price: 12.99 }, quantity: 2 },
            { menuItem: { name: 'Salad', price: 8.99 }, quantity: 1 }
        ],
        status: 'pending',
        totalAmount: 34.97,
        createdAt: new Date()
    },
    {
        id: 2,
        tableNumber: 2,
        items: [
            { menuItem: { name: 'Steak', price: 24.99 }, quantity: 1 },
            { menuItem: { name: 'Fries', price: 4.99 }, quantity: 1 },
            { menuItem: { name: 'Soda', price: 2.99 }, quantity: 2 }
        ],
        status: 'preparing',
        totalAmount: 35.96,
        createdAt: new Date()
    }
]

export default function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>(initialOrders)

    const updateOrderStatus = (id: number, status: Order['status']) => {
        setOrders(orders.map(order =>
            order.id === id ? { ...order, status } : order
        ))
    }

    const getStatusColor = (status: Order['status']) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            preparing: 'bg-blue-100 text-blue-800',
            served: 'bg-green-100 text-green-800',
            paid: 'bg-gray-100 text-gray-800'
        }
        return colors[status] || 'bg-gray-100'
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Orders</h2>
                <Button className="bg-green-600 hover:bg-green-700">
                    New Order
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                {orders.map(order => (
                    <Card key={order.id} className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>Table {order.tableNumber}</CardTitle>
                            <Badge className={getStatusColor(order.status)}>
                                {order.status.toUpperCase()}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Order Items */}
                            <div className="space-y-2">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <span>{item.quantity}x {item.menuItem.name}</span>
                                        <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t mt-4 pt-2 font-bold flex justify-between items-center">
                                    <span>Total:</span>
                                    <span>${order.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Time Info */}
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-1" />
                                {order.createdAt.toLocaleTimeString()}
                            </div>

                            {/* Status Buttons */}
                            {order.status !== 'paid' ? (
                                <div className="space-y-3">
                                    {/* Status Toggle Buttons */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            size="sm"
                                            variant={order.status === 'pending' ? 'default' : 'outline'}
                                            onClick={() => updateOrderStatus(order.id, 'pending')}
                                            className="w-full"
                                        >
                                            Pending
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={order.status === 'preparing' ? 'default' : 'outline'}
                                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                                            className="w-full"
                                        >
                                            Preparing
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={order.status === 'served' ? 'default' : 'outline'}
                                            onClick={() => updateOrderStatus(order.id, 'served')}
                                            className="w-full"
                                        >
                                            Served
                                        </Button>
                                    </div>

                                    {/* Payment Button */}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                                Mark Paid
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure? This action cannot be undone. The order will be marked as paid and locked.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => updateOrderStatus(order.id, 'paid')}
                                                >
                                                    Confirm Payment
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ) : (
                                <div className="text-center py-2 text-muted-foreground italic">
                                    Order completed
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}