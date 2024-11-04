// components/dashboard/ActiveOrders.tsx
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, UtensilsCrossed, CircleDollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
    id: string;
    quantity: number;
    item: {
        name_of_item: string;
        cost: number;
    };
}

interface Order {
    id: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'SERVED';
    created_at: string;
    completed_at: string | null;
    total_amount: number;
    table: {
        table_number: string;
    };
    order_items: OrderItem[];
    waiter_id: string | null;
}

export default function ActiveOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [staffId, setStaffId] = useState<string | null>(null);
    const supabase = createClient();
    const { selectedBranch, user } = useAuthStore();

    useEffect(() => {
        const getStaffId = async () => {
            if (!user?.id) return;

            try {
                const { data: mapping } = await supabase
                    .from('auth_staff_mapping')
                    .select('staff_id')
                    .eq('auth_user_id', user.id)
                    .single();

                if (mapping) {
                    setStaffId(mapping.staff_id);
                }
            } catch (error) {
                console.error('Error fetching staff ID:', error);
            }
        };

        getStaffId();
    }, [user?.id]);

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchOrders();
            // Set up real-time subscription
            const subscription = supabase
                .channel('active-orders')
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
                        item:menu(name_of_item, cost)
                    )
                `)
                .eq('branch_id', selectedBranch.id)
                .in('status', ['COMPLETED', 'IN_PROGRESS'])
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

    const markAsServed = async (orderId: string) => {
        if (!staffId) {
            toast.error('Staff ID not found');
            return;
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'SERVED',
                    waiter_id: staffId,
                    served_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .eq('status', 'COMPLETED'); // Only allow serving completed orders

            if (error) {
                console.error('Update error:', error);
                throw error;
            }

            toast.success('Order marked as served');
            await fetchOrders(); // Refresh the list
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update order status');
        }
    };

    const getTimeAgo = (dateString: string) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ago`;
    };

    if (loading) {
        return <div>Loading orders...</div>;
    }

    const readyOrders = orders.filter(order => order.status === 'COMPLETED');
    const preparingOrders = orders.filter(order => order.status === 'IN_PROGRESS');

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Active Orders</h2>
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-lg">
                        {readyOrders.length} Ready to Serve
                    </Badge>
                    <Badge variant="outline" className="text-lg">
                        {preparingOrders.length} Preparing
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="ready">
                <TabsList>
                    <TabsTrigger value="ready">
                        Ready to Serve ({readyOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="preparing">
                        Preparing ({preparingOrders.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ready" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {readyOrders.map(order => (
                            <Card key={order.id}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg">
                                        Table {order.table.table_number}
                                    </CardTitle>
                                    <Badge variant="success" className="bg-green-500">
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Ready
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {order.order_items.map((item, index) => (
                                            <div key={item.id} className="flex justify-between">
                                                <span>{item.quantity}x {item.item.name_of_item}</span>
                                                <span>${(item.item.cost * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}

                                        <div className="pt-2 border-t">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Completed</span>
                                                <span>{getTimeAgo(order.completed_at || order.created_at)}</span>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full"
                                            onClick={() => markAsServed(order.id)}
                                        >
                                            <UtensilsCrossed className="w-4 h-4 mr-2" />
                                            Mark as Served
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {readyOrders.length === 0 && (
                        <div className="text-center text-muted-foreground mt-8">
                            No orders ready to serve
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="preparing" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {preparingOrders.map(order => (
                            <Card key={order.id}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg">
                                        Table {order.table.table_number}
                                    </CardTitle>
                                    <Badge variant="secondary">
                                        <Clock className="w-4 h-4 mr-1" />
                                        Preparing
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {order.order_items.map((item, index) => (
                                            <div key={item.id} className="flex justify-between">
                                                <span>{item.quantity}x {item.item.name_of_item}</span>
                                                <span>${(item.item.cost * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}

                                        <div className="pt-2 border-t">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Ordered</span>
                                                <span>{getTimeAgo(order.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {preparingOrders.length === 0 && (
                        <div className="text-center text-muted-foreground mt-8">
                            No orders being prepared
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}