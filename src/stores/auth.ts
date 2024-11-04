import { create } from 'zustand'
import { User } from '@supabase/auth-helpers-nextjs'

interface Branch {
    id: string
    name: string
    code: string
}

interface AuthState {
    user: User | null
    activeSection: string
    selectedBranch: Branch | null
    isOwner: boolean
    setUser: (user: User | null) => void
    setActiveSection: (section: string) => void
    setSelectedBranch: (branch: Branch | null) => void
    setIsOwner: (isOwner: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    activeSection: 'tables',
    selectedBranch: null,
    isOwner: false,
    setUser: (user) => set({ user }),
    setActiveSection: (section) => set({ activeSection: section }),
    setSelectedBranch: (branch) => set({ selectedBranch: branch }),
    setIsOwner: (isOwner) => set({ isOwner: isOwner })
}))