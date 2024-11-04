// components/dashboard/OrderManagement.tsx
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
    id: string;
    quantity: number;
    item_special_requests: string;
    item: {
        name_of_item: string;
    };
}

interface Order {
    id: string;
    order_number: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    created_at: string;
    total_amount: number;
    order_special_requests?: string;
    is_rush: boolean;
    table: {
        table_number: string;
    };
    order_items: OrderItem[];
}

export default function OrderManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { selectedBranch } = useAuthStore();

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchOrders();
            // Set up real-time subscription
            const subscription = supabase
                .channel('orders-channel')
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `branch_id=eq.${selectedBranch.id}`
                    },
                    () => {
                        fetchOrders();
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [selectedBranch?.id]);

    const fetchOrders = async () => {
        if (!selectedBranch?.id) return;

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    table:restaurant_tables(table_number),
                    order_items(
                        id,
                        quantity,
                        item_special_requests,
                        item:menu(name_of_item)
                    )
                `)
                .eq('branch_id', selectedBranch.id)
                .eq('status', 'IN_PROGRESS')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, status: 'COMPLETED' | 'CANCELLED') => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status,
                    completed_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            toast.success(`Order ${status.toLowerCase()} successfully`);
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update order');
        }
    };

    const getOrderAge = (createdAt: string) => {
        const diff = Date.now() - new Date(createdAt).getTime();
        const minutes = Math.floor(diff / 60000);
        return minutes;
    };

    const getStatusColor = (minutes: number) => {
        if (minutes < 10) return 'bg-green-500';
        if (minutes < 20) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (loading) {
        return <div>Loading orders...</div>;
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Kitchen Display System</h2>
                <Badge variant="outline" className="text-lg">
                    {orders.length} Active Orders
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orders.map(order => {
                    const orderAge = getOrderAge(order.created_at);

                    return (
                        <Card key={order.id} className={`${order.is_rush ? 'border-red-500' : ''}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">
                                    Table {order.table.table_number}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {order.is_rush && (
                                        <Badge variant="destructive">RUSH</Badge>
                                    )}
                                    <Badge className={getStatusColor(orderAge)}>
                                        <Timer className="w-4 h-4 mr-1" />
                                        {orderAge}m
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {order.order_items.map((item, index) => (
                                        <div key={item.id} className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium">
                                                    {item.quantity}x {item.item.name_of_item}
                                                </div>
                                                {item.item_special_requests && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Note: {item.item_special_requests}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {order.order_special_requests && (
                                        <div className="mt-2 p-2 bg-muted rounded-md">
                                            <p className="text-sm font-medium">Special Instructions:</p>
                                            <p className="text-sm">{order.order_special_requests}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            className="flex-1"
                                            onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Mark Ready
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {orders.length === 0 && (
                <div className="text-center text-muted-foreground mt-8">
                    No active orders at the moment
                </div>
            )}
        </div>
    );
}