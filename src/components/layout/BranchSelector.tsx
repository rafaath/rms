'use client'

import { useAuthStore } from '@/stores/auth';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function BranchSelector() {
    const { staff, selectedBranch, setSelectedBranch } = useAuthStore();

    if (!staff?.accessible_branches || staff.accessible_branches.length <= 1) {
        return null;
    }

    return (
        <Select
            value={selectedBranch?.id}
            onValueChange={(branchId) => {
                const branch = staff.accessible_branches.find(b => b.id === branchId);
                setSelectedBranch(branch || null);
            }}
        >
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
                {staff.accessible_branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}