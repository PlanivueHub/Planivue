-- ============================================================
-- Schedule Architecture Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create schedule_weeks table
CREATE TABLE IF NOT EXISTS public.schedule_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'locked')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, week_start_date)
);

-- 2. Create new shifts table (drop old one first)
DROP TABLE IF EXISTS public.shifts CASCADE;

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schedule_week_id uuid NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create shift_assignments table
CREATE TABLE public.shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'swapped', 'cancelled')),
  hourly_rate_snapshot numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id, user_id)
);

-- 4. Create schedule_publications table
CREATE TABLE public.schedule_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schedule_week_id uuid NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  published_by uuid NOT NULL REFERENCES auth.users(id),
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create publication_snapshots table
CREATE TABLE public.publication_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  publication_id uuid NOT NULL REFERENCES public.schedule_publications(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL,
  user_id uuid NOT NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  hourly_rate numeric,
  metadata jsonb DEFAULT '{}'
);

-- 6. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.schedule_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: get tenant_id for current user (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- RLS Policies: schedule_weeks
-- ============================================================
CREATE POLICY "sw_tenant_select" ON public.schedule_weeks
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "sw_admin_mgr_insert" ON public.schedule_weeks
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

CREATE POLICY "sw_admin_mgr_update" ON public.schedule_weeks
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

CREATE POLICY "sw_admin_delete" ON public.schedule_weeks
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_role(auth.uid(), 'client_admin')
  );

-- ============================================================
-- RLS Policies: shifts
-- ============================================================
CREATE POLICY "shifts_tenant_select" ON public.shifts
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "shifts_admin_mgr_insert" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

CREATE POLICY "shifts_admin_mgr_update" ON public.shifts
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

CREATE POLICY "shifts_admin_mgr_delete" ON public.shifts
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

-- ============================================================
-- RLS Policies: shift_assignments
-- ============================================================
CREATE POLICY "sa_tenant_select" ON public.shift_assignments
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "sa_admin_mgr_insert" ON public.shift_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

CREATE POLICY "sa_admin_mgr_update" ON public.shift_assignments
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

CREATE POLICY "sa_admin_mgr_delete" ON public.shift_assignments
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

-- ============================================================
-- RLS Policies: schedule_publications
-- ============================================================
CREATE POLICY "sp_tenant_select" ON public.schedule_publications
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "sp_admin_mgr_insert" ON public.schedule_publications
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

-- ============================================================
-- RLS Policies: publication_snapshots
-- ============================================================
CREATE POLICY "ps_tenant_select" ON public.publication_snapshots
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "ps_admin_mgr_insert" ON public.publication_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager'))
  );

-- ============================================================
-- RLS Policies: audit_logs
-- ============================================================
CREATE POLICY "al_tenant_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "al_auth_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_schedule_weeks_tenant ON public.schedule_weeks(tenant_id);
CREATE INDEX idx_schedule_weeks_date ON public.schedule_weeks(week_start_date);
CREATE INDEX idx_shifts_week ON public.shifts(schedule_week_id);
CREATE INDEX idx_shifts_tenant ON public.shifts(tenant_id);
CREATE INDEX idx_shift_assignments_shift ON public.shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_user ON public.shift_assignments(user_id);
CREATE INDEX idx_shift_assignments_tenant ON public.shift_assignments(tenant_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_publications_week ON public.schedule_publications(schedule_week_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_schedule_weeks_updated_at
  BEFORE UPDATE ON public.schedule_weeks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_shift_assignments_updated_at
  BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
