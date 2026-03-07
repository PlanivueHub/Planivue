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

// ── Schedule Architecture ──────────────────────────────────

export interface ScheduleWeek {
  id: string;
  tenant_id: string;
  week_start_date: string;
  status: 'draft' | 'published' | 'locked';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  tenant_id: string;
  schedule_week_id: string;
  contract_id: string | null;
  start_datetime: string;
  end_datetime: string;
  label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  tenant_id: string;
  shift_id: string;
  user_id: string;
  status: 'assigned' | 'confirmed' | 'swapped' | 'cancelled';
  hourly_rate_snapshot: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchedulePublication {
  id: string;
  tenant_id: string;
  schedule_week_id: string;
  published_by: string;
  version: number;
  published_at: string;
}

export interface PublicationSnapshot {
  id: string;
  tenant_id: string;
  publication_id: string;
  shift_id: string;
  user_id: string;
  start_datetime: string;
  end_datetime: string;
  hourly_rate: number | null;
  metadata: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

// ── Legacy (kept for backward compat) ──────────────────────

/** @deprecated Use ScheduleWeek instead */
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

export interface Contract {
  id: string;
  tenant_id: string;
  title: string;
  client_name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string | null;
  value: number | null;
  description: string | null;
  billing_rate: number | null;
  break_rules: BreakRule[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BreakRule {
  threshold_hours: number;
  break_minutes: number;
}

export interface EmployeeDetail {
  id: string;
  user_id: string;
  tenant_id: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringAvailability {
  id: string;
  user_id: string;
  tenant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilityException {
  id: string;
  user_id: string;
  tenant_id: string;
  exception_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface PlatformMetrics {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_roles: number;
  published_schedules: number;
  total_shifts: number;
}
