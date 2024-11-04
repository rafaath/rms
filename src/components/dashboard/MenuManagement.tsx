'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type MenuItem = {
    id: number
    name: string
    price: number
    category: string
}

const initialMenuItems: MenuItem[] = [
    { id: 1, name: 'Pasta', price: 12.99, category: 'Main Course' },
    { id: 2, name: 'Salad', price: 8.99, category: 'Appetizer' },
    { id: 3, name: 'Steak', price: 24.99, category: 'Main Course' },
    { id: 4, name: 'Soda', price: 2.99, category: 'Beverage' },
]

export default function MenuManagement() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
    const [newItem, setNewItem] = useState<Omit<MenuItem, 'id'>>({ name: '', price: 0, category: '' })

    const addMenuItem = () => {
        if (newItem.name && newItem.price && newItem.category) {
            setMenuItems([...menuItems, { ...newItem, id: menuItems.length + 1 }])
            setNewItem({ name: '', price: 0, category: '' })
        }
    }

    const removeMenuItem = (id: number) => {
        setMenuItems(menuItems.filter(item => item.id !== id))
    }

    return (
        <div className="w-full">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Add New Item</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="item-name">Item Name</Label>
                            <Input
                                id="item-name"
                                placeholder="Item Name"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="item-price">Price</Label>
                            <Input
                                id="item-price"
                                type="number"
                                placeholder="Price"
                                value={newItem.price}
                                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="item-category">Category</Label>
                            <Input
                                id="item-category"
                                placeholder="Category"
                                value={newItem.category}
                                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button className="mt-4" onClick={addMenuItem}>Add Item</Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
                {menuItems.map(item => (
                    <Card key={item.id}>
                        <CardHeader>
                            <CardTitle>{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Price: ${item.price.toFixed(2)}</p>
                            <p>Category: {item.category}</p>
                            <Button
                                variant="destructive"
                                className="mt-2 w-full"
                                onClick={() => removeMenuItem(item.id)}
                            >
                                Remove
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}