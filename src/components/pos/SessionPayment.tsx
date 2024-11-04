// components/pos/SessionPayment.tsx
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DiningSession {
    id: string;
    table_id: string;
    total_amount: number;
    tax_amount: number;
    table: {
        table_number: string;
    };
    orders: {
        id: string;
        total_amount: number;
        order_items: {
            quantity: number;
            item: {
                name_of_item: string;
                cost: number;
            };
        }[];
    }[];
}

export default function SessionPayment() {
    const [sessions, setSessions] = useState<DiningSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<DiningSession | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const { selectedBranch } = useAuthStore();

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchActiveSessions();
        }
    }, [selectedBranch?.id]);

    const fetchActiveSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('dining_sessions')
                .select(`
                    *,
                    table:restaurant_tables(table_number),
                    orders(
                        id,
                        total_amount,
                        order_items(
                            quantity,
                            item:menu(name_of_item, cost)
                        )
                    )
                `)
                .eq('branch_id', selectedBranch?.id)
                .eq('status', 'IN_PROGRESS');

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to fetch active sessions');
        }
    };

    const handlePayment = async () => {
        if (!selectedSession) return;

        setLoading(true);
        try {
            // Create payment record
            const { error: paymentError } = await supabase
                .from('payments')
                .insert([{
                    id: crypto.randomUUID(),
                    order_id: selectedSession.orders[0].id, // Link to first order for reference
                    amount: selectedSession.total_amount + selectedSession.tax_amount,
                    status: 'COMPLETED',
                }]);

            if (paymentError) throw paymentError;

            // Update session status
            const { error: sessionError } = await supabase
                .from('dining_sessions')
                .update({
                    status: 'COMPLETED',
                    is_bill_printed: true
                })
                .eq('id', selectedSession.id);

            if (sessionError) throw sessionError;

            // Update table status
            const { error: tableError } = await supabase
                .from('restaurant_tables')
                .update({
                    status: 'AVAILABLE',
                    last_status_update: new Date().toISOString()
                })
                .eq('id', selectedSession.table_id);

            if (tableError) throw tableError;

            toast.success('Payment processed successfully');
            setIsPaymentModalOpen(false);
            setSelectedSession(null);
            fetchActiveSessions();
        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error('Failed to process payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Active Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map(session => (
                    <Card
                        key={session.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                            setSelectedSession(session);
                            setIsPaymentModalOpen(true);
                        }}
                    >
                        <CardHeader>
                            <CardTitle>Table {session.table.table_number}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p>Orders: {session.orders.length}</p>
                                <p>Subtotal: ${session.total_amount.toFixed(2)}</p>
                                <p>Tax: ${session.tax_amount.toFixed(2)}</p>
                                <p className="font-bold">
                                    Total: ${(session.total_amount + session.tax_amount).toFixed(2)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Process Payment</DialogTitle>
                    </DialogHeader>
                    {selectedSession && (
                        <div className="space-y-4">
                            <div className="border-b pb-2">
                                <h3 className="font-bold">Table {selectedSession.table.table_number}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedSession.orders.length} order(s)
                                </p>
                            </div>
                            {selectedSession.orders.map(order => (
                                <div key={order.id} className="space-y-2">
                                    {order.order_items.map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span>
                                                {item.quantity}x {item.item.name_of_item}
                                            </span>
                                            <span>
                                                ${(item.item.cost * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div className="border-t pt-2 space-y-1">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>${selectedSession.total_amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Tax:</span>
                                    <span>${selectedSession.tax_amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>
                                        ${(selectedSession.total_amount + selectedSession.tax_amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handlePayment} disabled={loading}>
                            {loading ? 'Processing...' : 'Complete Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}