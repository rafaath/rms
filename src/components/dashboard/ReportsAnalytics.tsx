// components/dashboard/ReportsAnalytics.tsx
'use client'





import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
    DollarSign,
    TrendingUp,
    Users,
    Clock,
    ShoppingBag,
    Utensils
} from 'lucide-react';
import { toast } from 'sonner';
// import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';  // Import Calendar
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';  // Import Popover
import { addDays, format, isAfter, isBefore, isValid } from 'date-fns'; // Add these date-fns imports
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker'; // Add this import
import { cn } from '@/lib/utils';

// import { Button } from "@/components/ui/button";
import {
    DownloadCloud,
    FileSpreadsheet,
    FilePdf,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SalesData {
    date: string;
    total: number;
    orders: number;
}

interface MenuItem {
    name: string;
    quantity: number;
    revenue: number;
}

interface PeakHour {
    hour: number;
    orders: number;
}

interface StaffPerformance {
    waiter: string;
    orders: number;
    revenue: number;
    avgServiceTime: number;
}

interface TableUtilization {
    table_number: string;
    orders: number;
    revenue: number;
    avgDuration: number;
}

export default function ReportsAnalytics() {
    // const [timeRange, setTimeRange] = useState('today');
    const [salesData, setSalesData] = useState<SalesData[]>([]);
    const [topItems, setTopItems] = useState<MenuItem[]>([]);
    const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
    const [tableUtilization, setTableUtilization] = useState<TableUtilization[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [avgOrderValue, setAvgOrderValue] = useState(0);
    const supabase = createClient();
    const { selectedBranch } = useAuthStore();
    const [timeRange, setTimeRange] = useState('today');
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchAnalytics();
        }
    }, [selectedBranch?.id, timeRange, date]);

    const getDateRange = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (timeRange === 'custom' && date?.from) {
            return {
                start: date.from.toISOString(),
                end: date.to ? date.to.toISOString() : new Date().toISOString()
            };
        }

        switch (timeRange) {
            case 'today':
                return { start: today.toISOString() };
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return { start: weekAgo.toISOString() };
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return { start: monthAgo.toISOString() };
            case 'year':
                const yearAgo = new Date(today);
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                return { start: yearAgo.toISOString() };
            default:
                return { start: today.toISOString() };
        }
    };
    const fetchAnalytics = async () => {
        if (!selectedBranch?.id) return;
        setLoading(true);

        try {
            const { start, end } = getDateRange();
            console.log('Date range:', { start, end }); // Debug log

            // Base query for orders
            let ordersQuery = supabase
                .from('orders')
                .select(`
                    created_at,
                    total_amount,
                    tax_amount
                `)
                .eq('branch_id', selectedBranch.id)
                .in('status', ['SERVED', 'COMPLETED'])
                .gte('created_at', start);

            // Add end date for custom range
            if (end) {
                ordersQuery = ordersQuery.lte('created_at', end);
            }

            const { data: salesData, error: salesError } = await ordersQuery;

            if (salesError) {
                console.error('Sales data error:', salesError);
                throw salesError;
            }

            // Process sales data with date range awareness
            const salesByDate = salesData.reduce((acc: Record<string, SalesData>, order) => {
                const date = format(new Date(order.created_at), 'yyyy-MM-dd');
                if (!acc[date]) {
                    acc[date] = { date, total: 0, orders: 0 };
                }
                acc[date].total += (order.total_amount + order.tax_amount);
                acc[date].orders += 1;
                return acc;
            }, {});

            // Fill in missing dates in the range
            if (date?.from && date?.to) {
                let currentDate = new Date(date.from);
                while (currentDate <= date.to) {
                    const dateStr = format(currentDate, 'yyyy-MM-dd');
                    if (!salesByDate[dateStr]) {
                        salesByDate[dateStr] = { date: dateStr, total: 0, orders: 0 };
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            // Sort by date and set sales data
            const sortedSalesData = Object.values(salesByDate)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setSalesData(sortedSalesData);

            // Calculate totals
            const totals = salesData.reduce((acc, order) => ({
                revenue: acc.revenue + (order.total_amount + order.tax_amount),
                orders: acc.orders + 1
            }), { revenue: 0, orders: 0 });

            setTotalRevenue(totals.revenue);
            setTotalOrders(totals.orders);
            setAvgOrderValue(totals.orders ? totals.revenue / totals.orders : 0);

            // Base query for order items
            let itemsQuery = supabase
                .from('order_items')
                .select(`
                    quantity,
                    item:menu(name_of_item, cost),
                    order:orders(created_at, branch_id)
                `)
                .eq('order.branch_id', selectedBranch.id)
                .gte('order.created_at', start);

            // Add end date for custom range
            if (end) {
                itemsQuery = itemsQuery.lte('order.created_at', end);
            }

            const { data: itemsData, error: itemsError } = await itemsQuery;

            if (itemsError) {
                console.error('Items data error:', itemsError);
                throw itemsError;
            }

            // Process menu items data
            const itemStats = itemsData.reduce((acc: Record<string, MenuItem>, item) => {
                if (!item.item?.name_of_item || !item.order) return acc;

                const name = item.item.name_of_item;
                if (!acc[name]) {
                    acc[name] = { name, quantity: 0, revenue: 0 };
                }
                acc[name].quantity += item.quantity;
                acc[name].revenue += item.quantity * (item.item.cost || 0);
                return acc;
            }, {});

            setTopItems(
                Object.values(itemStats)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10)
            );

            // Calculate peak hours with date range awareness
            const hourlyData = salesData.reduce((acc: Record<number, number>, order) => {
                const orderDate = new Date(order.created_at);

                // Only include orders within the selected date range
                if ((!date?.from || orderDate >= date.from) &&
                    (!date?.to || orderDate <= date.to)) {
                    const hour = orderDate.getHours();
                    acc[hour] = (acc[hour] || 0) + 1;
                }
                return acc;
            }, {});

            // Fill in missing hours
            for (let i = 0; i < 24; i++) {
                if (!hourlyData[i]) {
                    hourlyData[i] = 0;
                }
            }

            setPeakHours(
                Object.entries(hourlyData)
                    .map(([hour, orders]) => ({
                        hour: parseInt(hour),
                        orders
                    }))
                    .sort((a, b) => a.hour - b.hour) // Sort by hour for better visualization
            );

        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = (data: any[], filename: string) => {
        // Convert data to CSV format
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row =>
                headers.map(header =>
                    // Handle commas and quotes in the data
                    JSON.stringify(row[header] ?? '')
                ).join(',')
            )
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const prepareReportData = () => {
        // Sales Summary
        const salesSummary = salesData.map(day => ({
            Date: format(new Date(day.date), 'MMM dd, yyyy'),
            'Total Sales': `$${day.total.toFixed(2)}`,
            'Number of Orders': day.orders,
            'Average Order Value': `$${(day.total / day.orders).toFixed(2)}`
        }));

        // Top Items Summary
        const itemsSummary = topItems.map(item => ({
            'Item Name': item.name,
            'Quantity Sold': item.quantity,
            'Total Revenue': `$${item.revenue.toFixed(2)}`,
            'Average Price': `$${(item.revenue / item.quantity).toFixed(2)}`
        }));

        // Peak Hours Summary
        const hoursSummary = peakHours.map(hour => ({
            'Hour': `${hour.hour}:00`,
            'Number of Orders': hour.orders,
            'Percentage of Daily Orders': `${((hour.orders / totalOrders) * 100).toFixed(1)}%`
        }));

        return {
            salesSummary,
            itemsSummary,
            hoursSummary
        };
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
                <div className="flex gap-2">
                    <Select
                        value={timeRange}
                        onValueChange={setTimeRange}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Last 7 Days</SelectItem>
                            <SelectItem value="month">Last 30 Days</SelectItem>
                            <SelectItem value="year">Last Year</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {timeRange === 'custom' && (
                        <div className="grid gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-[300px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "LLL dd, y")} -{" "}
                                                    {format(date.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(date.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                        disabled={(date) =>
                                            isAfter(date, new Date()) ||
                                            isBefore(date, new Date(2023, 0, 1))
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <DownloadCloud className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                                const { salesSummary, itemsSummary, hoursSummary } = prepareReportData();
                                const dateRange = timeRange === 'custom' && date?.from && date?.to
                                    ? `${format(date.from, 'MMM_dd')}-${format(date.to, 'MMM_dd')}`
                                    : timeRange;

                                // Export Sales Data
                                exportToCSV(
                                    salesSummary,
                                    `sales_report_${dateRange}.csv`
                                );
                            }}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export Sales Report
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                                const { itemsSummary } = prepareReportData();
                                const dateRange = timeRange === 'custom' && date?.from && date?.to
                                    ? `${format(date.from, 'MMM_dd')}-${format(date.to, 'MMM_dd')}`
                                    : timeRange;

                                // Export Items Data
                                exportToCSV(
                                    itemsSummary,
                                    `items_report_${dateRange}.csv`
                                );
                            }}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export Items Report
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                                const { hoursSummary } = prepareReportData();
                                const dateRange = timeRange === 'custom' && date?.from && date?.to
                                    ? `${format(date.from, 'MMM_dd')}-${format(date.to, 'MMM_dd')}`
                                    : timeRange;

                                // Export Peak Hours Data
                                exportToCSV(
                                    hoursSummary,
                                    `peak_hours_report_${dateRange}.csv`
                                );
                            }}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export Peak Hours Report
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${totalRevenue.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Orders
                        </CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrders}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Average Order Value
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${avgOrderValue.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            Peak Hour
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {peakHours[0]?.hour || 0}:00
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                                />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => ['$' + value.toFixed(2)]}
                                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#8884d8"
                                    name="Sales"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Top Items and Peak Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topItems.slice(0, 5)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip />
                                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue">
                                        {topItems.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Peak Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="hour"
                                        tickFormatter={(hour) => `${hour}:00`}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        labelFormatter={(hour) => `${hour}:00`}
                                    />
                                    <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}