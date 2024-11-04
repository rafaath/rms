'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Plus, Minus, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { POSBranchSelector } from './BranchSelector'
import { Input } from '../ui/input';
interface MenuItem {
    id: string;
    name_of_item: string;
    cost: number;
    category: string;
    description?: string;
}

interface OrderItem {
    id: string;
    menuItem: MenuItem;
    quantity: number;
    specialInstructions?: string;
}

const TableOrders = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const [staffId, setStaffId] = useState<string | null>(null);
    const { selectedBranch, user } = useAuthStore();
    const [sessionNotes, setSessionNotes] = useState('');

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
    // Reset state when branch changes
    useEffect(() => {
        setSelectedTable(null);
        setCurrentOrder([]);
        setMenuItems([]);
        setCategories([]);
        setTables([]);
        setIsPaymentModalOpen(false);

        if (selectedBranch?.id) {
            initializeData();
        } else {
            setLoading(false);
        }
    }, [selectedBranch?.id]);

    const initializeData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchMenuItems(), fetchTables()]);
        } catch (error) {
            console.error("Error initializing POS data:", error);
            toast.error("Failed to initialize POS system");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initializeData = async () => {
            if (!selectedBranch?.id) {
                console.log("No branch selected");
                setLoading(false);
                return;
            }

            try {
                console.log("Fetching data for branch:", selectedBranch.id);
                await Promise.all([fetchMenuItems(), fetchTables()]);
            } catch (error) {
                console.error("Error initializing POS data:", error);
                toast.error("Failed to initialize POS system");
            } finally {
                setLoading(false);
            }
        };

        initializeData();
    }, [selectedBranch?.id]);

    const fetchMenuItems = async () => {
        if (!selectedBranch?.id) return;

        try {
            console.log("Fetching menu items...");
            const { data, error } = await supabase
                .from('menu')
                .select('id, name_of_item, cost, category, description')
                .eq('branch_id', selectedBranch.id)
                .eq('is_active', true);

            if (error) throw error;

            console.log("Menu items fetched:", data?.length);
            setMenuItems(data || []);

            // Extract unique categories
            const uniqueCategories = [...new Set(data?.map(item => item.category) || [])];
            console.log("Categories:", uniqueCategories);
            setCategories(uniqueCategories);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            toast.error('Failed to fetch menu items');
        }
    };

    const handleTableSelect = async (tableId: string) => {
        setSelectedTable(tableId);

        // Fetch existing session notes if table is occupied
        try {
            const { data: existingSession, error } = await supabase
                .from('dining_sessions')
                .select('notes')
                .eq('table_id', tableId)
                .eq('status', 'IN_PROGRESS')
                .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

            if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
                console.error('Error fetching session notes:', error);
                return;
            }

            // Set notes from existing session if available, otherwise clear notes
            setSessionNotes(existingSession?.notes || '');

        } catch (error) {
            console.error('Error checking session:', error);
        }
    };

    const fetchTables = async () => {
        if (!selectedBranch?.id) {
            console.log("No branch selected");
            return;
        }

        setLoading(true);
        try {
            console.log("Fetching tables for branch:", selectedBranch.id);

            // First, get all tables for the branch
            const { data: tablesData, error: tablesError } = await supabase
                .from('restaurant_tables')
                .select(`
                    id,
                    table_number,
                    status,
                    capacity,
                    dining_sessions!left(
                        id,
                        status
                    )
                `)
                .eq('branch_id', selectedBranch.id)
                .eq('dining_sessions.status', 'IN_PROGRESS')
                .order('table_number');

            if (tablesError) {
                console.error("Tables fetch error:", tablesError);
                throw tablesError;
            }

            console.log("Fetched tables:", tablesData);
            setTables(tablesData || []);
        } catch (error: any) {
            console.error('Error fetching tables:', error.message || error);
            toast.error('Failed to fetch tables');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchTables();
        }
    }, [selectedBranch?.id]);

    const addToOrder = (menuItem: MenuItem) => {
        setCurrentOrder(prev => {
            const existingItem = prev.find(item => item.menuItem.id === menuItem.id);
            if (existingItem) {
                return prev.map(item =>
                    item.menuItem.id === menuItem.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { id: crypto.randomUUID(), menuItem, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCurrentOrder(prev => {
            const updatedOrder = prev.map(item => {
                if (item.id === itemId) {
                    const newQuantity = item.quantity + delta;
                    return { ...item, quantity: newQuantity };
                }
                return item;
            });

            // Filter out items with quantity 0 or less
            return updatedOrder.filter(item => item.quantity > 0);
        });
    };

    const calculateTotal = () => {
        return currentOrder.reduce(
            (sum, item) => sum + item.menuItem.cost * item.quantity,
            0
        );
    };

    // In your TableOrders.tsx

    const handleOrder = async () => {
        if (!selectedBranch?.id || !selectedTable || currentOrder.length === 0) {
            toast.error('Please select a table and add items to the order');
            return;
        }

        if (!staffId) {
            toast.error('Staff information not found');
            return;
        }

        setLoading(true);
        try {
            const { data: existingSession, error: sessionQueryError } = await supabase
                .from('dining_sessions')
                .select('id, total_amount, tax_amount')
                .eq('table_id', selectedTable)
                .eq('status', 'IN_PROGRESS')
                .maybeSingle();

            if (sessionQueryError) {
                console.error('Session query error:', sessionQueryError);
                throw sessionQueryError;
            }

            let sessionId = existingSession?.id;
            const orderTotal = calculateTotal();
            const orderTax = orderTotal * 0.1;

            // Only changing the session creation part in handleOrder
            if (!existingSession) {
                // Generate a single UUID for both id and session_id
                const newSessionId = crypto.randomUUID();

                const { data: newSession, error: createSessionError } = await supabase
                    .from('dining_sessions')
                    .insert([
                        {
                            id: newSessionId,
                            session_id: newSessionId,
                            branch_id: selectedBranch.id,  // Add branch_id
                            table_id: selectedTable,
                            changed_by: staffId,
                            changed_at: new Date().toISOString(),
                            status: 'IN_PROGRESS',
                            number_of_guests: 1,
                            total_amount: orderTotal,
                            tax_amount: orderTax,
                            is_bill_printed: false,
                            notes: sessionNotes || null
                        }
                    ])
                    .select()
                    .single();

                if (createSessionError) {
                    console.error('Create session error:', createSessionError);
                    throw createSessionError;
                }

                sessionId = newSession.id;

                const { error: tableError } = await supabase
                    .from('restaurant_tables')
                    .update({
                        status: 'OCCUPIED',
                        last_status_update: new Date().toISOString()
                    })
                    .eq('id', selectedTable);

                if (tableError) throw tableError;
            } else {
                const newTotal = (existingSession.total_amount || 0) + orderTotal;
                const newTax = (existingSession.tax_amount || 0) + orderTax;

                const { error: updateSessionError } = await supabase
                    .from('dining_sessions')
                    .update({
                        total_amount: newTotal,
                        tax_amount: newTax,
                        changed_by: staffId,
                        changed_at: new Date().toISOString(),
                        notes: sessionNotes // Update notes if changed
                    })
                    .eq('id', existingSession.id);

                if (updateSessionError) throw updateSessionError;
                sessionId = existingSession.id;
            }

            // Rest of your code remains the same...
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert([
                    {
                        id: crypto.randomUUID(),
                        branch_id: selectedBranch.id,
                        dining_session_id: sessionId,
                        table_id: selectedTable,
                        total_amount: orderTotal,
                        tax_amount: orderTax,
                        status: 'IN_PROGRESS',
                        order_number: 1
                    }
                ])
                .select()
                .single();

            if (orderError) throw orderError;

            const orderItems = currentOrder.map(item => ({
                id: crypto.randomUUID(),
                order_id: newOrder.id,
                item_id: item.menuItem.id,
                quantity: item.quantity,
                item_special_requests: item.specialInstructions || ''
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            toast.success('Order placed successfully');
            setCurrentOrder([]);
            setIsPaymentModalOpen(false);
            await fetchTables();
        } catch (error: any) {
            console.error('Error processing order:', error.message || error);
            toast.error(error.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };
    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-lg">Loading POS system...</div>
            </div>
        );
    }

    // Branch selection state
    if (!selectedBranch) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-2xl font-bold">Select a Branch</h2>
                <p className="text-muted-foreground mb-4">Please select a branch to continue</p>
                <POSBranchSelector />
            </div>
        );
    }

    // No menu items state
    if (categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-2xl font-bold">No Menu Items</h2>
                <p className="text-muted-foreground">No menu items available for {selectedBranch.name}.</p>
                <p className="text-muted-foreground">Please add items to the menu first.</p>
            </div>
        );
    }




    return (


        <div className="flex h-[calc(100vh-8rem)]">
            {/* Menu Section */}
            <div className="flex-1 p-4 overflow-auto">
                <Tabs defaultValue={categories[0]}>
                    <TabsList className="mb-4">
                        {categories.map(category => (
                            <TabsTrigger key={category} value={category}>
                                {category}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {categories.map(category => (
                        <TabsContent key={category} value={category}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {menuItems
                                    .filter(item => item.category === category)
                                    .map(item => (
                                        <Card
                                            key={item.id}
                                            className="cursor-pointer hover:bg-accent"
                                            onClick={() => addToOrder(item)}
                                        >
                                            <CardHeader>
                                                <CardTitle className="text-lg">{item.name_of_item}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                                <p className="font-bold mt-2">${item.cost.toFixed(2)}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Order Section */}
            <div className="w-96 border-l bg-muted p-4 flex flex-col">
                <div className="mb-4">
                    <Label>Select Table</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {tables.map(table => (
                            <Button
                                key={table.id}
                                variant={selectedTable === table.id ? "default" : "outline"}
                                onClick={() => handleTableSelect(table.id)}
                                className={`h-12 ${table.status === 'OCCUPIED' ? 'border-green-500' : ''}`}
                            >
                                {table.table_number}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {currentOrder.map(item => (
                        <Card key={item.id} className="mb-2">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{item.menuItem.name_of_item}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        ${(item.menuItem.cost * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, -1)}
                                    // No need for disabled state since we'll remove the item
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span>{item.quantity}</span>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, 1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between mb-4">
                        <span className="font-bold">Total:</span>
                        <span className="font-bold">${calculateTotal().toFixed(2)}</span>
                    </div>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={currentOrder.length === 0 || !selectedTable}
                    >
                        Place Order
                    </Button>
                </div>
            </div>

            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Order</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total Amount:</span>
                            <span>${calculateTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Tax (10%):</span>
                            <span>${(calculateTotal() * 0.1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-4">
                            <span>Final Total:</span>
                            <span>${(calculateTotal() * 1.1).toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Session Notes (Optional)</Label>
                            <Input
                                id="notes"
                                placeholder="Add any notes for this session..."
                                value={sessionNotes}
                                onChange={(e) => setSessionNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleOrder} disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TableOrders;