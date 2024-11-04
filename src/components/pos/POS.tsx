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

const POS = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { selectedBranch } = useAuthStore();

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

    const fetchTables = async () => {
        if (!selectedBranch?.id) return;

        try {
            console.log("Fetching tables...");
            const { data, error } = await supabase
                .from('restaurant_tables')
                .select('*')
                .eq('branch_id', selectedBranch.id)
                .order('table_number');

            if (error) throw error;

            console.log("Tables fetched:", data?.length);
            setTables(data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast.error('Failed to fetch tables');
        }
    };

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
        setCurrentOrder(prev =>
            prev.map(item => {
                if (item.id === itemId) {
                    const newQuantity = item.quantity + delta;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
                }
                return item;
            }).filter(item => item.quantity > 0)
        );
    };

    const calculateTotal = () => {
        return currentOrder.reduce(
            (sum, item) => sum + item.menuItem.cost * item.quantity,
            0
        );
    };

    const handlePayment = async () => {
        if (!selectedTable || currentOrder.length === 0) {
            toast.error('Please select a table and add items to the order');
            return;
        }

        setLoading(true);
        try {
            // Create dining session
            const sessionId = crypto.randomUUID();
            const { error: sessionError } = await supabase
                .from('dining_sessions')
                .insert([
                    {
                        id: sessionId,
                        session_id: sessionId, // Using the same ID for both fields
                        branch_id: selectedBranch?.id,
                        table_id: selectedTable,
                        number_of_guests: 1,
                        status: 'IN_PROGRESS',
                        total_amount: calculateTotal(),
                        tax_amount: calculateTotal() * 0.1, // 10% tax example
                    }
                ]);

            if (sessionError) throw sessionError;

            // Create order
            const orderId = crypto.randomUUID();
            const { error: orderError } = await supabase
                .from('orders')
                .insert([
                    {
                        id: orderId,
                        branch_id: selectedBranch?.id,
                        dining_session_id: sessionId,
                        table_id: selectedTable,
                        total_amount: calculateTotal(),
                        tax_amount: calculateTotal() * 0.1,
                        status: 'IN_PROGRESS',
                        order_number: 1, // You might want to generate this sequentially
                    }
                ]);

            if (orderError) throw orderError;

            // Create order items
            const orderItems = currentOrder.map(item => ({
                id: crypto.randomUUID(),
                order_id: orderId,
                item_id: item.menuItem.id,
                quantity: item.quantity,
                item_special_requests: item.specialInstructions || '',
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Update table status
            const { error: tableError } = await supabase
                .from('restaurant_tables')
                .update({ status: 'OCCUPIED' })
                .eq('id', selectedTable);

            if (tableError) throw tableError;

            toast.success('Order placed successfully');
            setCurrentOrder([]);
            setSelectedTable(null);
            setIsPaymentModalOpen(false);

            // Refresh tables after successful order
            await fetchTables();
        } catch (error) {
            console.error('Error processing order:', error);
            toast.error('Failed to process order');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-lg">Loading POS system...</div>
            </div>
        );
    }

    if (!selectedBranch) {
        return (
            <div className="flex items-center justify-center h-full">
                <POSBranchSelector />
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-lg">No menu items available. Please add items to the menu first.</div>
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
                                onClick={() => setSelectedTable(table.id)}
                                disabled={table.status === 'OCCUPIED'}
                                className="h-12"
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
                        <CreditCard className="mr-2 h-4 w-4" />
                        Process Payment
                    </Button>
                </div>
            </div>

            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Payment</DialogTitle>
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
                        {/* Add payment method selection and other payment details here */}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handlePayment} disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default POS;