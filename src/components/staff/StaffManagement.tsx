// components/staff/StaffManagement.tsx
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, UserPlus, Mail, Lock, BadgeCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Role {
    id: string;
    name: string;
    description: string;
}

interface Staff {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    generated_password: string;
    code: string;
    role: Role;
    status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
    created_at: string;
}

export default function StaffManagement() {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        roleId: '',
    });
    const supabase = createClient();
    const { selectedBranch, user } = useAuthStore();

    useEffect(() => {
        if (selectedBranch?.id) {
            fetchStaffAndRoles();
        }
    }, [selectedBranch?.id]);

    const fetchStaffAndRoles = async () => {
        try {
            // Fetch roles
            const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select('*')
                .order('name');

            if (rolesError) throw rolesError;
            setRoles(rolesData);

            // Fetch staff with their roles
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select(`
                    *,
                    role:roles(*)
                `)
                .eq('branch_id', selectedBranch?.id)
                .order('created_at', { ascending: false });

            if (staffError) throw staffError;
            setStaff(staffData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to fetch staff data');
        } finally {
            setLoading(false);
        }
    };

    const generateEmail = (firstName: string, lastName: string) => {
        const sanitizedFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const sanitizedLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);

        // Use a domain that's authorized in your Supabase project
        return `${sanitizedFirstName}.${sanitizedLastName}.${randomNum}@gmail.com`;
    };

    const generatePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    // In your StaffManagement component, update the handleAddStaff function:

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBranch?.id) {
            toast.error('No branch selected');
            return;
        }

        setLoading(true);
        try {
            const email = generateEmail(formData.firstName, formData.lastName, 'yourfranchise');
            const password = generatePassword();
            const staffCode = `STF${Math.floor(1000 + Math.random() * 9000)}`;

            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                roleId: formData.roleId,
                branchId: selectedBranch.id,
                franchiseId: selectedBranch.franchise_id,
                email,
                password,
                staffCode,
            };

            console.log('Sending staff creation request:', payload);

            const response = await fetch('/api/staff/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add staff member');
            }

            console.log('Staff creation successful:', data);

            toast.success('Staff member added successfully', {
                description: `Email: ${email}\nPassword: ${password}`,
                duration: 10000,
            });

            setIsAddDialogOpen(false);
            setFormData({ firstName: '', lastName: '', roleId: '' });
            await fetchStaffAndRoles();

        } catch (error: any) {
            console.error('Error adding staff:', error);
            toast.error(error.message || 'Failed to add staff member');
        } finally {
            setLoading(false);
        }
    };
    if (loading) {
        return <div>Loading staff management...</div>;
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Staff Management</h2>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Staff Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Staff Member</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={formData.roleId}
                                    onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Staff Member'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member) => (
                    <Card key={member.id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>
                                    {member.first_name} {member.last_name}
                                </span>
                                <BadgeCheck className={`h-5 w-5 ${member.status === 'ACTIVE' ? 'text-green-500' :
                                    member.status === 'ON_LEAVE' ? 'text-yellow-500' :
                                        'text-red-500'
                                    }`} />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm">
                                    <Mail className="h-4 w-4 mr-2" />
                                    {member.email}
                                </div>
                                <div className="flex items-center text-sm">
                                    <Lock className="h-4 w-4 mr-2" />
                                    {member.generated_password}
                                </div>
                                <div className="mt-4">
                                    <span className="text-sm font-medium">Role:</span>
                                    <span className="ml-2 text-sm">{member.role.name}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium">Staff Code:</span>
                                    <span className="ml-2 text-sm">{member.code}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}