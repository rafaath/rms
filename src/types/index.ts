export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid';
  totalAmount: number;
  createdAt: Date;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}


// types/index.ts
export interface Role {
  id: string;
  name: string;
  is_owner: boolean;
  can_manage_franchises: boolean;
  can_manage_branches: boolean;
  can_manage_roles: boolean;
  can_manage_tables: boolean;
  can_manage_orders: boolean;
  can_manage_payments: boolean;
  can_manage_staff: boolean;
  can_manage_menu: boolean;
  can_view_reports: boolean;
  parent_role_id: string | null;
}

export interface Staff {
  id: string;
  branch_id: string;
  franchise_id: string;
  first_name: string;
  last_name: string;
  code: string;
  role_id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  email: string | null;
  phone: string | null;
  role: Role;
}

export interface Branch {
  id: string;
  franchise_id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TEMPORARILY_CLOSED';
}