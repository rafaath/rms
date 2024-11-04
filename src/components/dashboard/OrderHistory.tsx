// components/dashboard/OrderHistory.tsx
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UtensilsCrossed, Timer, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderItem {
    id: string;
    quantity: number;
    item: {
        name_of_item: string;
        cost: number;
    } | null;
}

interface Order {
    id: string;
    status: 'SERVED' | 'CANCELLED';
    created_at: string;
    completed_at: string | null;
    served_at: string | null;
    total_amount: number;
    tax_amount: number;
    table: {
        table_number: string;
    } | null;
    order_items: OrderItem[];
    waiter: {
        first_name: string;
        last_name: string;
    } | null;
}

export default function OrderHistory() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SERVED' | 'CANCELLED'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const supabase = createClient();
    const { selectedBranch } = useAuthStore();

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchOrders();
        }
    }, [selectedBranch?.id, statusFilter, dateFilter]);

    const fetchOrders = async () => {
        if (!selectedBranch?.id) return;

        try {
            let startDate;
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Calculate start date based on filter
            switch (dateFilter) {
                case 'today':
                    startDate = now.toISOString();
                    break;
                case 'week':
                    const weekAgo = new Date(now);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    startDate = weekAgo.toISOString();
                    break;
                case 'month':
                    const monthAgo = new Date(now);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    startDate = monthAgo.toISOString();
                    break;
            }

            console.log('Fetching orders with params:', {
                branchId: selectedBranch.id,
                status: statusFilter,
                startDate
            });

            let query = supabase
                .from('orders')
                .select(`
        id,
        status,
        created_at,
        completed_at,
        served_at,
        total_amount,
        tax_amount,
        order_special_requests,
        table:restaurant_tables!left (
            table_number
        ),
        waiter:staff!left (
            first_name,
            last_name
        ),
        order_items!left (
            id,
            quantity,
            item:menu!left (
                name_of_item,
                cost
            )
        )
    `)
                .eq('branch_id', selectedBranch.id)
                .gte('created_at', startDate);

            if (statusFilter !== 'ALL') {
                query = query.eq('status', statusFilter);
            } else {
                query = query.in('status', ['SERVED', 'CANCELLED']);
            }

            // Add this console.log for debugging
            const { data, error } = await query.order('created_at', { ascending: false });
            console.log('Raw query response:', { data, error });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Fetched orders:', data?.length);
            setOrders(data || []);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            toast.error(error.message || 'Failed to fetch order history');
        } finally {
            setLoading(false);
        }
    };

    const getOrderTiming = (order: Order) => {
        const created = new Date(order.created_at);
        const completed = order.completed_at ? new Date(order.completed_at) : null;
        const served = order.served_at ? new Date(order.served_at) : null;

        const preparationTime = completed &&
            Math.round((completed.getTime() - created.getTime()) / 60000);

        const serviceTime = served && completed &&
            Math.round((served.getTime() - completed.getTime()) / 60000);

        return { preparationTime, serviceTime };
    };

    const filteredOrders = orders.filter(order => {
        return (
            order.table.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.order_items.some(item =>
                item.item.name_of_item.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    });

    if (loading) {
        return <div>Loading order history...</div>;
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Order History</h2>
                <Badge variant="outline" className="text-lg">
                    {filteredOrders.length} Orders
                </Badge>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search by table or item..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="SERVED">Served</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={dateFilter}
                    onValueChange={setDateFilter}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredOrders.map(order => {
                    const { preparationTime, serviceTime } = getOrderTiming(order);

                    return (
                        <Card key={order.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">
                                    Table {order.table.table_number}
                                </CardTitle>
                                <Badge
                                    variant={order.status === 'SERVED' ? 'default' : 'destructive'}
                                >
                                    {order.status === 'SERVED' ? (
                                        <UtensilsCrossed className="w-4 h-4 mr-1" />
                                    ) : (
                                        <Ban className="w-4 h-4 mr-1" />
                                    )}
                                    {order.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {order.order_items.map((item) => (
                                        <div key={item.id} className="flex justify-between">
                                            <span>{item.quantity}x {item.item.name_of_item}</span>
                                            <span>${(item.item.cost * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}

                                    <div className="pt-2 border-t space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal:</span>
                                            <span>${order.total_amount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Tax:</span>
                                            <span>${order.tax_amount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold">
                                            <span>Total:</span>
                                            <span>
                                                ${(order.total_amount + order.tax_amount).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t space-y-1 text-sm text-muted-foreground">
                                        <div className="flex justify-between">
                                            <span>Server:</span>
                                            <span>
                                                {order.waiter ? (
                                                    <span>
                                                        {order.waiter.first_name} {order.waiter.last_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">No server assigned</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Created:</span>
                                            <span>
                                                {format(new Date(order.created_at), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                        {preparationTime && (
                                            <div className="flex justify-between">
                                                <span>Prep Time:</span>
                                                <span>{preparationTime} mins</span>
                                            </div>
                                        )}
                                        {serviceTime && (
                                            <div className="flex justify-between">
                                                <span>Service Time:</span>
                                                <span>{serviceTime} mins</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredOrders.length === 0 && (
                <div className="text-center text-muted-foreground mt-8">
                    No orders found matching your criteria
                </div>
            )}
        </div>
    );
}