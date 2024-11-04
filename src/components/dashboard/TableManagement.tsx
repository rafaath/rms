'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Table = {
    id: number
    number: number
    seats: number
    status: 'available' | 'occupied' | 'reserved'
}

const initialTables: Table[] = [
    { id: 1, number: 1, seats: 4, status: 'available' },
    { id: 2, number: 2, seats: 2, status: 'occupied' },
    { id: 3, number: 3, seats: 6, status: 'reserved' },
]

export default function TableManagement() {
    const [tables, setTables] = useState<Table[]>(initialTables)

    const updateTableStatus = (id: number, status: Table['status']) => {
        setTables(tables.map(table =>
            table.id === id ? { ...table, status } : table
        ))
    }

    const getStatusColor = (status: Table['status']) => {
        switch (status) {
            case 'available':
                return 'bg-green-500'
            case 'occupied':
                return 'bg-red-500'
            case 'reserved':
                return 'bg-yellow-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Table Management</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tables.map(table => (
                    <Card key={table.id}>
                        <CardHeader>
                            <CardTitle>Table {table.number}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Seats: {table.seats}</p>
                            <Badge className={`${getStatusColor(table.status)} text-white`}>{table.status}</Badge>
                            <div className="mt-4 space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => updateTableStatus(table.id, 'available')}
                                >
                                    Available
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => updateTableStatus(table.id, 'occupied')}
                                >
                                    Occupied
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => updateTableStatus(table.id, 'reserved')}
                                >
                                    Reserved
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}