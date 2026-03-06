export type AppRole = 'saas_owner' | 'client_admin' | 'client_manager' | 'client_employee';

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  tenant_id: string | null;
  role: AppRole;
}

export interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  role: AppRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  tenant_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  tenant_id: string;
  schedule_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformMetrics {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_roles: number;
  published_schedules: number;
  total_shifts: number;
}
